const ARTIST_ID = 6808334229;
const FEATURED_TITLE = 'caught in the rise';
const CACHE_SECONDS = 3600;

function lookup(params) {
  const query = new URLSearchParams({ country: 'US', ...params });
  return fetch('https://itunes.apple.com/lookup?' + query, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
  }).then(response => {
    if (!response.ok) throw new Error('Catalog request failed');
    return response.json();
  });
}

function safeUrl(value, host) {
  try {
    const url = new URL(value);
    const matches = typeof host === 'string' ? url.hostname === host : host.test(url.hostname);
    return url.protocol === 'https:' && matches && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

export async function onRequestGet({ request, waitUntil }) {
  const cacheKey = new Request(new URL('/api/catalog', request.url));
  const cache = globalThis.caches?.default;
  try {
    const saved = await cache?.match(cacheKey);
    if (saved) return saved;
  } catch {
    // The public catalog can still be fetched when the cache is unavailable.
  }

  try {
    const data = await lookup({ id: ARTIST_ID, entity: 'album', limit: 200 });
    if (!Array.isArray(data.results) || !data.results.some(item => item.artistId === ARTIST_ID && item.wrapperType === 'artist')) {
      throw new Error('Artist missing from response');
    }
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
    const releases = data.results.flatMap(item => {
      const date = item.releaseDate?.slice(0, 10);
      const url = safeUrl(item.collectionViewUrl, 'music.apple.com');
      if (item.wrapperType !== 'collection' || item.artistId !== ARTIST_ID || item.collectionType !== 'Album' ||
          typeof item.collectionName !== 'string' || !Number.isSafeInteger(item.collectionId) ||
          !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today || !url) return [];
      const title = item.collectionName.replace(/\s+-\s+(?:Single|EP)$/i, '').trim();
      const art = safeUrl(item.artworkUrl100, /^(?:[a-z0-9-]+\.)*mzstatic\.com$/);
      return [{ id: item.collectionId, title, date, url, art }];
    }).sort((a, b) => b.date.localeCompare(a.date));
    const featured = releases.find(item => item.title.toLowerCase() === FEATURED_TITLE);
    let preview = null;

    if (featured) {
      try {
        const tracks = await lookup({ id: featured.id, entity: 'song' });
        const track = tracks.results.find(item => item.wrapperType === 'track' && item.kind === 'song' &&
          item.artistId === ARTIST_ID && item.collectionId === featured.id &&
          item.trackName?.toLowerCase() === FEATURED_TITLE);
        const previewHost = /^(?:audio-ssl\.itunes\.apple\.com|(?:[a-z0-9-]+\.)*mzstatic\.com)$/;
        preview = safeUrl(track?.previewUrl, previewHost);
      } catch {
        // A failed preview lookup should still leave the catalog usable.
      }
    }

    const response = Response.json({
      featured: featured ? { url: featured.url, preview } : null,
      releases: releases.filter(item => item.title.toLowerCase() !== FEATURED_TITLE),
    }, { headers: { 'Cache-Control': 'public, max-age=' + CACHE_SECONDS } });
    if (cache) waitUntil(cache.put(cacheKey, response.clone()).catch(() => {}));
    return response;
  } catch {
    return Response.json({ error: 'Catalog temporarily unavailable' }, {
      status: 502,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
