import { readFile, writeFile } from 'node:fs/promises';
import { discover, SERVICES, serviceFor } from './release-links.mjs';
import { syncReleasePages } from './render-release-links.mjs';

const dataPath = 'public/data/caught-in-the-rise-links.json';
const data = JSON.parse(await readFile(dataPath, 'utf8'));
const result = await discover();
console.log(result.diagnostics.join('\n'));
// A transient failure never removes previously verified links.
const merged = new Map(data.links.map(link => [link.service, link]));
for (const link of result.links) if (serviceFor(link.url) === link.service) merged.set(link.service, link);
data.links = [...merged.values()].sort((a, b) => Object.keys(SERVICES).indexOf(a.service) - Object.keys(SERVICES).indexOf(b.service));
await syncReleasePages(data.links);
await writeFile(dataPath, JSON.stringify(data, null, 2) + '\n');
console.log('Verified service links retained/published:', data.links.map(link => link.service).join(', '));
