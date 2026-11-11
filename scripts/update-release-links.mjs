import { readFile, writeFile } from 'node:fs/promises';
import { discover, SERVICES, serviceFor } from './release-links.mjs';

const pagePath = 'public/songs/caught-in-the-rise/index.html';
const dataPath = 'public/data/caught-in-the-rise-links.json';
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const result = await discover();
console.log(result.diagnostics.join('\n'));
// A transient failure never removes previously verified links.
const merged = new Map(data.links.map(link => [link.service, link]));
for (const link of result.links) if (serviceFor(link.url) === link.service) merged.set(link.service, link);
data.links = [...merged.values()].sort((a, b) => Object.keys(SERVICES).indexOf(a.service) - Object.keys(SERVICES).indexOf(b.service));
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const buttons = data.links.map(({ service, url }) => {
  const [label, icon] = SERVICES[service];
  return `              <a class="service-link button" data-service="${service}" href="${escape(url)}"><svg class="service-icon" aria-hidden="true" focusable="false"><use href="../../assets/music-services.svg#${icon}"></use></svg>${label}</a>`;
}).join('\n');
let html = await readFile(pagePath, 'utf8');
const marker = /<!-- release-services:start -->[\s\S]*?<!-- release-services:end -->/;
if (!marker.test(html)) throw new Error('Song page update markers missing; refusing to edit');
html = html.replace(marker, `<!-- release-services:start -->\n${buttons}\n              <!-- release-services:end -->`);
if (data.links.length) html = html.replace('id="release-links-pending">', 'id="release-links-pending" hidden>');
await writeFile(pagePath, html);
await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log('Verified service links retained/published:', data.links.map(link => link.service).join(', '));
