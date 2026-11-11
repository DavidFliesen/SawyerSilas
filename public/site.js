const SITE_ROOT = new URL('./', document.currentScript.src);
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
    const { releases } = await response.json();
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

if (records && location.protocol.startsWith('http')) {
  loadCatalog();
  setInterval(() => { if (!document.hidden) loadCatalog(); }, 300000);
}
