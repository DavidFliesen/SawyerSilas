import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const decode = value => value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const attrs = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m => [m[1], decode(m[3])]));
const caughtServices = {
  spotify: /^https:\/\/open\.spotify\.com\/(?:album|track)\/[A-Za-z0-9]+(?:\?.*)?$/,
  applemusic: /^https:\/\/music\.apple\.com\/[a-z]{2}\/(?:album|song)\/[^/?]+\/\d+(?:\?.*)?$/,
  itunes: /^https:\/\/music\.apple\.com\/[a-z]{2}\/(?:album|song)\/[^/?]+\/\d+\?.*\bapp=itunes\b/,
  amazonmusic: /^https:\/\/music\.amazon\.(?:com|co\.uk)\/(?:albums|tracks)\/[A-Z0-9]+(?:\?.*)?$/,
  youtube: /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+(?:&.*)?$/,
  youtubemusic: /^https:\/\/music\.youtube\.com\/watch\?v=[\w-]+(?:&.*)?$/,
  tidal: /^https:\/\/(?:listen\.|www\.)?tidal\.com\/(?:browse\/)?(?:album|track)\/\d+(?:\?.*)?$/,
  iheartradio: /^https:\/\/www\.iheart\.com\/artist\/[^/]+\/(?:albums|songs)\/[^/?]+\/?$/,
  deezer: /^https:\/\/www\.deezer\.com\/(?:[a-z]{2}\/)?(?:album|track)\/\d+$/,
};
async function walk(dir) {
  const files = [];
  for (const item of await readdir(dir, {withFileTypes:true})) {
    const path = resolve(dir, item.name);
    files.push(...(item.isDirectory() ? await walk(path) : [path]));
  }
  return files;
}
export async function auditSite(directory, { expectedVersion } = {}) {
  const root = resolve(directory);
  const allFiles = await walk(root);
  const htmlFiles = allFiles.filter(path => path.endsWith('.html'));
  const caseNames = new Map();
  for (const path of allFiles) {
    const name = relative(root, path);
    const lower = name.toLowerCase();
    if (caseNames.has(lower)) throw new Error('Case-duplicate files: ' + caseNames.get(lower) + ' and ' + name);
    caseNames.set(lower, name);
    if (/(^|[\\/])index\.html$/i.test(name) && !/(^|[\\/])index\.html$/.test(name)) throw new Error('Use lowercase index.html: ' + name);
  }
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
    if (!html.includes('Ridgeworn Records') || !/Website release v\d+\.\d+\.\d+/.test(html)) errors.push(name + ': footer credits/version missing');
    if (expectedVersion && !html.includes('Website release v' + expectedVersion)) errors.push(name + ': expected website release v' + expectedVersion);
  }
  for (const required of ['index.html', 'songs/caught-in-the-rise/index.html', 'songs/gator-bob/index.html', 'songs/one-more-angel/index.html']) {
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
  const caughtPages = ['index.html','songs/caught-in-the-rise/index.html'];
  const grids = caughtPages.map(name => {
    const html = pages.get(resolve(root,name))?.html || '';
    const actual = [...html.matchAll(/<a\b[^>]*data-service="[^"]+"[^>]*>/g)].map(m=>attrs(m[0]));
    const services = new Map(actual.map(link => [link['data-service'], link.href]));
    if (services.size !== actual.length) errors.push(name + ': duplicate listening service');
    for (const [service, pattern] of Object.entries(caughtServices)) {
      const url = services.get(service);
      if (!url) errors.push(name + ': missing listening service ' + service);
      else if (!pattern.test(url)) errors.push(name + ': invalid direct URL for ' + service);
    }
    return services;
  });
  for (const [service, url] of grids[0]) if (grids[1].get(service) !== url) errors.push('Caught in the Rise grids disagree for ' + service);
  if (errors.length) throw new Error('Site audit failed:\n' + errors.join('\n'));
  const result = {directory, pages:htmlFiles.length, internalReferences, featuredServices:grids[0].size, errors:0};
  console.log(JSON.stringify(result));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await auditSite(process.argv[2] || 'public');
