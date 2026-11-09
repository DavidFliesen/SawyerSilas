const RELEASE_DATE = '2026-11-11';
const SITE_ROOT = new URL('./', document.currentScript.src);
const LOCAL_PREVIEW = ''; // Set to 'assets/caught-in-the-rise-preview.mp3' after adding your clip.
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const audio = document.querySelector('#preview');
const previewStatus = document.querySelector('#preview-status');
const featuredPlayer = document.querySelector('#featured-player');
const records = document.querySelector('#records');
const share = document.querySelector('#share');
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

if (previewStatus && today >= RELEASE_DATE) {
  previewStatus.textContent = 'Streaming links will appear as services list the single.';
}

function showPreview(source, message) {
  audio.src = source;
  audio.hidden = false;
  previewStatus.textContent = message;
}

audio?.addEventListener('error', () => {
  audio.hidden = true;
  previewStatus.textContent = 'The audio preview is unavailable. Use the listening link to find the single.';
});

if (audio && LOCAL_PREVIEW) showPreview(new URL(LOCAL_PREVIEW, SITE_ROOT), 'Listen to a preview of “Caught in the Rise.”');

function addCatalogRelease(release) {
  const record = document.createElement('article');
  record.className = 'record';
  record.dataset.date = release.date;
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
    const response = await fetch(new URL('api/catalog?v=2', SITE_ROOT), { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const { featured, releases } = await response.json();
    if (audio && featured?.url) {
      const apple = document.querySelector('#featured-apple');
      apple.href = featured.url;
      apple.hidden = false;
      if (!LOCAL_PREVIEW) {
        previewStatus.textContent = 'Listen to the single on Apple Music.';
        if (featured.embed && featuredPlayer) {
          featuredPlayer.src = featured.embed;
          featuredPlayer.hidden = false;
          previewStatus.textContent = 'Play a preview here, or open the single on Apple Music.';
        } else if (featured.preview) {
          showPreview(featured.preview, 'Listen to an Apple Music preview of “Caught in the Rise.”');
        }
      }
    }
    if (!records) return;
    const key = (title, date) => title.trim().toLowerCase() + '|' + date;
    const existing = new Set([...records.children].map(row => key(row.dataset.title, row.dataset.date)));
    for (const release of releases) {
      const id = key(release.title, release.date);
      if (existing.has(id)) continue;
      addCatalogRelease(release);
      existing.add(id);
    }
  } catch {
    // The featured release and existing listening links are part of the static page.
  }
}

if (navigator.share || navigator.clipboard) {
  share.hidden = false;
  share.addEventListener('click', async () => {
    const url = new URL(location.pathname, location.href).href;
    const status = document.querySelector('#share-status');
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Page link copied.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Copy the link from your address bar.';
    }
  });
}

if ((records || audio) && location.protocol.startsWith('http')) loadCatalog();
