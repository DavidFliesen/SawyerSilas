import { cp, readFile, readdir, rm, writeFile } from 'node:fs/promises';

import { syncReleasePages } from './scripts/render-release-links.mjs';
import { auditSite } from './scripts/audit-site.mjs';

const releaseLinks = JSON.parse(await readFile('public/data/caught-in-the-rise-links.json', 'utf8'));
await syncReleasePages(releaseLinks.links);
await auditSite('public');

// CF_PAGES_URL can be a one-deployment hostname. Canonicals use the permanent site.
const base = new URL(process.env.SITE_URL || 'https://sawyersilas.pages.dev/');
if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash) {
  throw new Error('SITE_URL must be a permanent HTTPS site URL');
}
if (!base.pathname.endsWith('/')) base.pathname += '/';
await rm('dist', { recursive: true, force: true });
await cp('public', 'dist', { recursive: true });
const songs = await readdir('dist/songs', { withFileTypes: true });
const pages = ['', ...songs.filter(item => item.isDirectory()).map(item => 'songs/' + item.name + '/')];
const artist = {
  '@type': 'MusicGroup', '@id': new URL('#artist', base).href, name: 'Sawyer Silas',
  url: base.href, genre: ['Country', 'Outlaw country', 'Blues'],
  image: new URL('assets/sawyer-silas.webp', base).href,
  sameAs: ['https://open.spotify.com/artist/2IvsRWouUpZ3KpmjlUSfos', 'https://music.apple.com/us/artist/sawyer-silas/6808334229'],
};
const escape = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
for (const path of pages) {
  const page = new URL(path, base);
  const file = 'dist/' + path + 'index.html';
  let html = await readFile(file, 'utf8');
  // Rebuild these owned tags without duplicating source metadata.
  html = html.replace(/\s*<link rel="canonical"[^>]*>/g, '').replace(/\s*<meta (?:property="og:url"|name="(?:robots|twitter:card|twitter:title|twitter:description|twitter:image)")[^>]*>/g, '').replace(/\s*<script type="application\/ld\+json" data-site-seo>[\s\S]*?<\/script>/g, '');
  const image = html.match(/<meta property="og:image" content="([^"]+)">/)?.[1];
  const imageUrl = new URL(image || 'assets/caught-in-the-rise.webp', page).href;
  html = html.replace(/<meta property="og:image" content="[^"]+">/, '<meta property="og:image" content="' + escape(imageUrl) + '">');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || 'Sawyer Silas';
  const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1] || '';
  const graph = [artist, { '@type': 'WebSite', '@id': new URL('#website', base).href, url: base.href, name: 'Sawyer Silas Music', inLanguage: 'en', publisher: { '@id': artist['@id'] } }];
  const webPage = { '@type': 'WebPage', '@id': page.href + '#webpage', url: page.href, name: title, description, inLanguage: 'en', isPartOf: { '@id': new URL('#website', base).href } };
  if (path === 'songs/caught-in-the-rise/') {
    const recording = { '@type': 'MusicRecording', '@id': page.href + '#recording', name: 'Caught in the Rise', url: page.href, datePublished: '2026-11-11', byArtist: { '@id': artist['@id'] }, genre: ['Country', 'Outlaw country'], image: imageUrl, sameAs: ['https://open.spotify.com/album/2Id9x5BGFVE7SSmULL5R2o'], inAlbum: { '@type': 'MusicAlbum', name: 'Caught in the Rise', albumReleaseType: 'https://schema.org/SingleRelease', recordLabel: { '@type': 'Organization', name: 'Ridgeworn Records' } } };
    graph.push(recording);
    webPage.mainEntity = { '@id': recording['@id'] };
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [ { '@type': 'ListItem', position: 1, name: 'Sawyer Silas', item: base.href }, { '@type': 'ListItem', position: 2, name: 'Caught in the Rise', item: page.href } ] });
  }
  graph.push(webPage);
  const tags = [
    '<link rel="canonical" href="' + escape(page.href) + '">',
    '<meta property="og:url" content="' + escape(page.href) + '">',
    '<meta name="robots" content="index,follow,max-image-preview:large">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + title + '">',
    '<meta name="twitter:description" content="' + description + '">',
    '<meta name="twitter:image" content="' + escape(imageUrl) + '">',
    '<script type="application/ld+json" data-site-seo>' + JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c') + '</script>',
  ].join('\n  ');
  html = html.replace('</head>', '  ' + tags + '\n</head>');
  await writeFile(file, html);
}
// The historical capitalized URL serves the same complete, canonical homepage.
await cp('dist/index.html', 'dist/Index.html');
await writeFile('dist/sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + pages.map(path => '  <url><loc>' + escape(new URL(path, base).href) + '</loc></url>').join('\n') + '\n</urlset>\n');
await writeFile('dist/robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: ' + new URL('sitemap.xml', base).href + '\n');

await auditSite('dist');
