// Metadata only: never request audio, video, or preview files.
export const TITLE = 'Caught in the Rise';
export const ARTIST = 'Sawyer Silas';
export const SPOTIFY = 'https://open.spotify.com/album/2Id9x5BGFVE7SSmULL5R2o';
export const SERVICES = {
  spotify: ['Spotify', 'spotify', /^https:\/\/open\.spotify\.com\/(album|track)\/[A-Za-z0-9]+(?:\?.*)?$/],
  applemusic: ['Apple Music', 'applemusic', /^https:\/\/music\.apple\.com\/[a-z]{2}\/(album|song)\/[^/?]+\/\d+(?:\?.*)?$/],
  itunes: ['iTunes', 'itunes', /^https:\/\/music\.apple\.com\/[a-z]{2}\/(album|song)\/[^/?]+\/\d+\?.*app=itunes/],
  amazonmusic: ['Amazon Music', 'amazonmusic', /^https:\/\/music\.amazon\.(com|co\.uk)\/(albums|tracks)\/[A-Z0-9]+(?:\?.*)?$/],
  youtube: ['YouTube', 'youtube', /^https:\/\/www\.youtube\.com\/watch\?v=[\w-]+(?:&.*)?$/],
  youtubemusic: ['YouTube Music', 'youtubemusic', /^https:\/\/music\.youtube\.com\/watch\?v=[\w-]+(?:&.*)?$/],
  tidal: ['TIDAL', 'tidal', /^https:\/\/(?:listen\.|www\.)?tidal\.com\/(?:browse\/)?(album|track)\/\d+(?:\?.*)?$/],
  qobuz: ['Qobuz', 'qobuz', /^https:\/\/www\.qobuz\.com\/[a-z]{2}-[a-z]{2}\/(album|track)\/[^?#]+$/],
  iheartradio: ['iHeartRadio', 'iheartradio', /^https:\/\/www\.iheart\.com\/artist\/[^/]+\/(albums|songs)\/[^/?]+\/?$/],
  deezer: ['Deezer', 'deezer', /^https:\/\/www\.deezer\.com\/(?:[a-z]{2}\/)?(album|track)\/\d+$/],
};
export function serviceFor(url) {
  return Object.keys(SERVICES).find(key => SERVICES[key][2].test(url));
}
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export async function get(url, fetcher = fetch) {
  const response = await fetcher(url, { headers: { Accept: 'application/json,text/html', 'User-Agent': 'SawyerSilas-ReleaseLinks/1.1.7' }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  if (/^(audio|video)\//i.test(response.headers.get('content-type') || '')) throw new Error('Media response rejected');
  return response;
}
export function verifiedMetadata(html) {
  // Do not accept body text or search snippets: the page's own title metadata
  // must identify this recording and artist together.
  const titles = [...html.matchAll(/<title[^>]*>([\s\S]*?)<\/title>/gi)].map(m => decode(m[1]));
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = Object.fromEntries([...match[0].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)].map(m => [m[1].toLowerCase(), decode(m[3])]));
    if (['og:title', 'twitter:title'].includes(attrs.property || attrs.name)) titles.push(attrs.content || '');
  }
  return titles.some(text => /^(?:Listen to )?Caught in the Rise(?: - Single)?(?: - Album)?(?: by | · | - | – | — |, )Sawyer Silas(?:$| \|| on | - | – | — )/i.test(text.trim()));
}
export async function discover(fetcher = fetch) {
  const found = new Map();
  const diagnostics = [];
  async function source(name, task) {
    try { await task(); diagnostics.push(name + ': ok'); }
    catch (error) { diagnostics.push(name + ': ' + error.message); }
  }
  const candidates = new Set([SPOTIFY]);
  await Promise.all([
    source('Cross-service discovery', async () => {
      const data = await (await get('https://api.song.link/v1-alpha.1/links?userCountry=US&url=' + encodeURIComponent(SPOTIFY), fetcher)).json();
      for (const link of Object.values(data.linksByPlatform || {})) if (serviceFor(link.url)) candidates.add(link.url);
    }),
    source('Apple US catalog', async () => {
      const data = await (await get('https://itunes.apple.com/lookup?id=6808334229&entity=album&country=US&limit=200', fetcher)).json();
      for (const item of data.results || []) {
        if (item.artistId !== 6808334229 || item.artistName !== ARTIST || item.collectionType !== 'Album' || item.collectionName?.replace(/ - Single$/i, '').toLowerCase() !== TITLE.toLowerCase()) continue;
        if (serviceFor(item.collectionViewUrl) === 'applemusic') found.set('applemusic', item.collectionViewUrl);
      }
    }),
    source('Deezer catalog', async () => {
      const data = await (await get('https://api.deezer.com/search?q=' + encodeURIComponent('artist:"Sawyer Silas" track:"Caught in the Rise"'), fetcher)).json();
      for (const item of data.data || []) if (item.title?.toLowerCase() === TITLE.toLowerCase() && item.artist?.name === ARTIST && serviceFor(item.link) === 'deezer') found.set('deezer', item.link);
    }),
    source('HyperFollow discovery', async () => {
      const html = await (await get('https://distrokid.com/hyperfollow/sawyersilas/caught-in-the-rise', fetcher)).text();
      // Candidate discovery only. Every candidate is checked on its own service below.
      for (const match of decode(html).replace(/\\\//g, '/').matchAll(/https:\/\/[^\s<>"'\\]+/g)) {
        if (serviceFor(match[0])) candidates.add(match[0]);
      }
    }),
  ]);
  await Promise.all([...candidates].map(url => source(new URL(url).hostname, async () => {
    const response = await get(url, fetcher);
    if (serviceFor(response.url || url) !== serviceFor(url)) throw new Error('Unexpected redirect');
    if (!verifiedMetadata(await response.text())) throw new Error('Recording identity not verified');
    found.set(serviceFor(url), url);
  })));
  return { links: [...found].map(([service, url]) => ({ service, url })), diagnostics };
}
