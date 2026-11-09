import { cp, readFile, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
const siteUrl = process.env.SITE_URL || process.env.CF_PAGES_URL;
if (siteUrl) {
  const url = new URL(siteUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('SITE_URL must be an HTTPS origin, such as https://music.example.com');
  }
  const file = 'dist/index.html';
  const html = await readFile(file, 'utf8');
  const sharing = [
    '<link rel="canonical" href="' + url.origin + '/">',
    '<meta property="og:url" content="' + url.origin + '/">',
    '<meta property="og:image" content="' + url.origin + '/assets/caught-in-the-rise.webp">',
  ].join('\n  ');
  await writeFile(file, html.replace('<meta property="og:image" content="/assets/caught-in-the-rise.webp">', sharing));
}
