const SITE_ROOT = new URL('./', document.currentScript.src);
const releaseGrid = document.querySelector('.release-links .service-grid');
const records = document.querySelector('#records');
const share = document.querySelector('#share');
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

for (const player of document.querySelectorAll('.song-preview')) {
  const showError = () => {
    player.hidden = true;
    if (player.nextElementSibling) player.nextElementSibling.hidden = false;
  };
  player.addEventListener('error', showError);
  if (player.error) showError();
}

function addCatalogRelease(release) {
  const record = document.createElement('article');
  record.className = 'record';
  record.dataset.date = release.date;
  record.dataset.title = release.title;
  if (release.art) {
    const art = document.createElement('img');
    art.src = release.art;
    art.alt = '';
    art.width = 64;
    art.height = 64;
    art.loading = 'lazy';
    record.append(art);
  } else {
    record.append(document.createElement('span'));
  }
  const details = document.createElement('div');
  const date = document.createElement('p');
  date.className = 'record-date';
  const time = document.createElement('time');
  time.dateTime = release.date;
  time.textContent = dateFormat.format(new Date(release.date));
  date.append(time);
  const title = document.createElement('h3');
  title.textContent = release.title;
  details.append(date, title);
  const link = document.createElement('a');
  link.className = 'text-link service-link';
  link.href = release.url;
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const icon = document.createElementNS(svgNamespace, 'svg');
  icon.setAttribute('class', 'service-icon');
  icon.setAttribute('aria-hidden', 'true');
  icon.setAttribute('focusable', 'false');
  const use = document.createElementNS(svgNamespace, 'use');
  use.setAttribute('href', new URL('assets/music-services.svg#applemusic', SITE_ROOT).href);
  icon.append(use);
  link.append(icon, 'Apple Music');
  link.setAttribute('aria-label', 'Listen to ' + release.title + ' on Apple Music');
  record.append(details, link);
  const next = [...records.children].find(row => row.dataset.date < release.date);
  records.insertBefore(record, next || null);
}

async function loadCatalog() {
  try {
    const response = await fetch(new URL('api/catalog?v=3', SITE_ROOT), { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const { featured, releases } = await response.json();
    if (releaseGrid && featured?.url) addReleaseLinks([{ service: 'applemusic', url: featured.url }]);
    if (!records) return;
    const key = (title, date) => title.trim().toLowerCase() + '|' + date;
    const existing = new Set([...records.children].map(row => key(row.dataset.title, row.dataset.date)));
    for (const release of Array.isArray(releases) ? releases : []) {
      if (typeof release.title !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(release.date)) continue;
      try {
        const url = new URL(release.url);
        if (url.protocol !== 'https:' || url.hostname !== 'music.apple.com' || url.username || url.password) continue;
      } catch { continue; }
      const id = key(release.title, release.date);
      if (existing.has(id)) continue;
      addCatalogRelease(release);
      existing.add(id);
    }
  } catch {
    // The featured release and existing listening links are part of the static page.
  }
}

if (share && (navigator.share || navigator.clipboard)) {
  share.hidden = false;
  share.addEventListener('click', async () => {
    const url = new URL(location.pathname, location.href).href;
    const status = document.querySelector('#share-status');
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        if (status) status.textContent = 'Page link copied.';
      }
    } catch (error) {
      if (status && error.name !== 'AbortError') status.textContent = 'Copy the link from your address bar.';
    }
  });
}

if ((records || releaseGrid) && location.protocol.startsWith('http')) loadCatalog();

// Published links remain available when the live Apple lookup is blocked.
const releaseServices = {
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
function addReleaseLinks(links) {
  for (const { service, url } of links || []) {
    const spec = releaseServices[service];
    if (!releaseGrid || !spec || typeof url !== 'string' || !spec[2].test(url) || releaseGrid.querySelector('[data-service="' + service + '"]')) continue;
    const link = document.createElement('a');
    link.className = 'service-link button';
    link.dataset.service = service;
    link.href = url;
    const ns = 'http://www.w3.org/2000/svg';
    const icon = document.createElementNS(ns, 'svg');
    icon.setAttribute('class', 'service-icon');
    icon.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(ns, 'use');
    use.setAttribute('href', new URL('assets/music-services.svg#' + spec[1], SITE_ROOT).href);
    icon.append(use);
    link.append(icon, spec[0]);
    releaseGrid.append(link);
  }
  if (releaseGrid.querySelector('a[href]')) {
    releaseGrid.hidden = false;
    const pending = document.querySelector('#release-links-pending');
    if (pending) pending.hidden = true;
  }
}
if (releaseGrid && location.protocol.startsWith('http')) {
  const refreshLinks = async () => {
    try {
      const response = await fetch(new URL('data/caught-in-the-rise-links.json', SITE_ROOT), { cache: 'no-cache' });
      if (response.ok) addReleaseLinks((await response.json()).links);
    } catch { /* The static HTML still contains the last verified links. */ }
  };
  refreshLinks();
  setInterval(() => { if (!document.hidden) { refreshLinks(); loadCatalog(); } }, 300000);
}
