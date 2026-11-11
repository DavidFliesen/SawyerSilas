import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m => [m[1], decode(m[3])]));
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, {withFileTypes:true})) {
    const path = resolve(dir, item.name);
    files.push(...(item.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
export async function auditSite(directory) {
  const root = resolve(directory);
  const htmlFiles = (await walk(root)).filter(path => path.endsWith('.html'));
  const errors = [], pages = new Map();
  let internalReferences = 0;
  for (const path of htmlFiles) {
    const html = await readFile(path, 'utf8');
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
    pages.set(path, {html, ids: new Set(ids)});
    const name = relative(root, path);
    if (!/<!doctype html>/i.test(html) || !/<head[\s>]/i.test(html) || !/<main[\s>]/i.test(html) || !/<h1[\s>]/i.test(html) || !/<\/html>/i.test(html)) errors.push(name + ': incomplete or empty page');
    if (ids.length !== new Set(ids).size) errors.push(name + ': duplicate element IDs');
    for (const id of ['story', 'listen', 'artist', 'main']) if (!ids.includes(id)) errors.push(name + ': missing #' + id);
    const grid = html.match(/<div class="service-grid"[^>]*>([\s\S]*?)<\/div>/)?.[1] || '';
    const serviceLinks = [...grid.matchAll(/<a\b[^>]+>/g)].map(m => attrs(m[0]));
    if (serviceLinks.length < 8) errors.push(name + ': listening services missing');
    if (/songs\/(?:gator-bob|one-more-angel)\//.test(name)) {
      const required = ['spotify', 'applemusic', 'amazonmusic', 'youtubemusic', 'tidal', 'qobuz', 'iheartradio', 'amazon'];
      if (name.includes('gator-bob')) required.push('youtube');
      for (const icon of required) if (!grid.includes('music-services.svg#' + icon + '"')) errors.push(name + ': missing listening service ' + icon);
    }
    if (new Set(serviceLinks.map(a => a.href)).size !== serviceLinks.length) errors.push(name + ': duplicate service URLs');
    if (/Read the Story<\/a>/i.test(html)) errors.push(name + ': short story button returned');
    if ((html.match(/class="button primary"[^>]*>Read the Full Story<\/a>/g) || []).length !== 1) errors.push(name + ': expected one full story action');
    if (/distrokid\.com\/hyperfollow|<iframe/i.test(html)) errors.push(name + ': unexpected redirect service or embedded player');
    if (!html.includes('Ridgeworn Records') || !html.includes('Website release v1.1.14')) errors.push(name + ': footer credits/version missing');
  }
  for (const required of ['index.html', 'Index.html', 'songs/caught-in-the-rise/index.html', 'songs/gator-bob/index.html', 'songs/one-more-angel/index.html']) {
    if (!pages.has(resolve(root, required))) errors.push('Required page missing: ' + required);
  }
  for (const [path, {html}] of pages) {
    const pageUrl = new URL(relative(root, path).split(sep).join('/'), 'https://audit.invalid/');
    for (const match of html.matchAll(/<(?:a|img|script|link|use|audio|source)\b[^>]*>/g)) {
      const a = attrs(match[0]);
      for (const key of ['href','src']) {
        if (!(key in a)) continue;
        const value = a[key];
        if (!value || /^(?:javascript:|data:)/i.test(value)) {errors.push(relative(root,path) + ': unsafe or empty URL'); continue;}
        const url = new URL(value, pageUrl);
        if (url.origin !== pageUrl.origin) continue;
        internalReferences++;
        let target = resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!target.startsWith(root + sep) && target !== root) {errors.push('Reference escapes site root');continue;}
        try {if ((await stat(target)).isDirectory()) target = resolve(target,'index.html'); await stat(target);}
        catch {errors.push(relative(root,path) + ': missing ' + value);continue;}
        if (url.hash) {
          const id = decodeURIComponent(url.hash.slice(1));
          const targetIds = pages.get(target)?.ids || new Set([...(await readFile(target,'utf8')).matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
          if (!targetIds.has(id)) errors.push(relative(root,path) + ': broken fragment ' + value);
        }
      }
    }
  }
  const data = JSON.parse(await readFile(resolve(root,'data/caught-in-the-rise-links.json'),'utf8'));
  for (const name of ['index.html','Index.html','songs/caught-in-the-rise/index.html']) {
    const html = pages.get(resolve(root,name))?.html || '';
    const actual = [...html.matchAll(/<a\b[^>]*data-service="[^"]+"[^>]*>/g)].map(m=>attrs(m[0]));
    if (actual.length !== data.links.length) errors.push(name + ': service count differs from saved link data');
    for (const {service,url} of data.links) if (!actual.some(a=>a['data-service']===service && a.href===url)) errors.push(name + ': missing saved service ' + service);
  }
  if (errors.length) throw new Error('Site audit failed:\n' + errors.join('\n'));
  const result = {directory, pages:htmlFiles.length, internalReferences, featuredServices:data.links.length, errors:0};
  console.log(JSON.stringify(result));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await auditSite(process.argv[2] || 'public');
