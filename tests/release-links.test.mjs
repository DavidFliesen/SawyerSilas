import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { discover, serviceFor, verifiedMetadata, SPOTIFY } from '../scripts/release-links.mjs';

test('reject artist, search, pre-save, malicious hosts, and wrong metadata', () => {
  for (const url of ['https://open.spotify.com/artist/123', 'https://open.spotify.com/search/Caught', 'https://open.spotify.com.evil.test/album/123', 'https://distrokid.com/hyperfollow/x', 'javascript:alert(1)']) assert.equal(serviceFor(url), undefined);
  assert.equal(verifiedMetadata('<title>Caught in the Rise by Someone Else</title><p>Sawyer Silas</p>'), false);
  assert.equal(verifiedMetadata('<title>Search</title><p>Caught in the Rise by Sawyer Silas</p>'), false);
  assert.equal(verifiedMetadata('<title>Caught in the Rise Remix by Sawyer Silas</title>'), false);
  assert.equal(verifiedMetadata('<title>Listen to Caught in the Rise - Single by Sawyer Silas | Spotify</title>'), true);
});
test('Apple failure does not suppress verified Spotify; no media is requested', async () => {
  const requested = [];
  const result = await discover(async url => {
    requested.push(url);
    if (url === SPOTIFY) return new Response('<title>Caught in the Rise by Sawyer Silas | Spotify</title>', { headers: { 'content-type': 'text/html' } });
    return new Response('Blocked', { status: 403 });
  });
  assert.deepEqual(result.links, [{ service: 'spotify', url: SPOTIFY }]);
  assert.equal(requested.some(url => /\.(wav|mp3|m4a)(?:\?|$)/.test(url)), false);
  assert.ok(result.diagnostics.some(item => item.includes('HTTP 403')));
});
test('Apple title and artist must both match; resolver candidates need independent verification', async () => {
  const result = await discover(async url => {
    if (url.includes('itunes.apple.com')) return Response.json({ results: [
      { artistId: 6808334229, artistName: 'Sawyer Silas', collectionType: 'Album', collectionName: 'Caught in the Rise - Single', collectionViewUrl: 'https://music.apple.com/us/album/caught-in-the-rise-single/123' },
      { artistId: 6808334229, artistName: 'Wrong Artist', collectionType: 'Album', collectionName: 'Caught in the Rise - Single', collectionViewUrl: 'https://music.apple.com/us/album/wrong/999' },
    ] });
    if (url.includes('api.song.link')) return Response.json({ linksByPlatform: { amazonMusic: { url: 'https://music.amazon.com/albums/TEST123' } } });
    return new Response('<title>Unrelated release</title>');
  });
  assert.deepEqual(result.links, [{ service: 'applemusic', url: 'https://music.apple.com/us/album/caught-in-the-rise-single/123' }]);
});
test('Cloudflare upstream failure returns a usable partial response', async () => {
  const code = await readFile(new URL('../functions/api/catalog.js', import.meta.url), 'utf8');
  const { onRequestGet } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('Forbidden', { status: 403 });
  try {
    const response = await onRequestGet({ request: new Request('https://example.com/api/catalog'), waitUntil() {} });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).releases, []);
  } finally { globalThis.fetch = original; }
});
