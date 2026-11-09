import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
const siteUrl = process.env.SITE_URL || process.env.CF_PAGES_URL;
if (siteUrl) {
  const base = new URL(siteUrl);
  if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
    throw new Error('SITE_URL must be an HTTPS site URL, such as https://music.example.com');
  }
  if (!base.pathname.endsWith('/')) base.pathname += '/';

  const songs = await readdir('dist/songs', { withFileTypes: true });
  const pages = ['', ...songs.filter(item => item.isDirectory()).map(item => 'songs/' + item.name + '/')];
  for (const path of pages) {
    const page = new URL(path, base);
    const file = 'dist/' + path + 'index.html';
    const html = await readFile(file, 'utf8');
    const updated = html.replace(/<meta property="og:image" content="([^"]+)">/, (_, imagePath) => [
      '<link rel="canonical" href="' + page.href + '">',
      '<meta property="og:url" content="' + page.href + '">',
      '<meta property="og:image" content="' + new URL(imagePath, page).href + '">',
    ].join('\n  '));
    await writeFile(file, updated);
  }
}
