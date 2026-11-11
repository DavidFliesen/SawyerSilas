import { readFile, writeFile } from 'node:fs/promises';
import { SERVICES, serviceFor } from './release-links.mjs';

export const RELEASE_PAGES = ['public/index.html', 'public/Index.html', 'public/songs/caught-in-the-rise/index.html'];
export const escapeHTML = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
export function renderReleaseLinks(html, links, assetRoot) {
  const markers = /<!-- release-services:start -->[\s\S]*?<!-- release-services:end -->/g;
  if ((html.match(markers) || []).length !== 1) throw new Error('Exactly one listening service block is required');
  const seen = new Set();
  if (!links.length) throw new Error('Refusing to publish an empty listening list');
  const buttons = links.map(({service, url}) => {
    if (serviceFor(url) !== service || seen.has(service)) throw new Error('Invalid or duplicate service: ' + service);
    seen.add(service);
    const [label, icon] = SERVICES[service];
    return `              <a class="service-link button" data-service="${service}" href="${escapeHTML(url)}"><svg class="service-icon" aria-hidden="true" focusable="false"><use href="${assetRoot}music-services.svg#${icon}"></use></svg>${label}</a>`;
  }).join('\n');
  return html.replace(markers, `<!-- release-services:start -->\n${buttons}\n              <!-- release-services:end -->`);
}
export async function syncReleasePages(links) {
  // Validate every target before writing any target.
  const pending = await Promise.all(RELEASE_PAGES.map(async path => {
    const html = await readFile(path, 'utf8');
    return [path, renderReleaseLinks(html, links, path.includes('/songs/') ? '../../assets/' : './assets/')];
  }));
  for (const [path, html] of pending) await writeFile(path, html);
}
