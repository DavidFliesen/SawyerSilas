const RELEASE_DATE = '2026-11-11';
const LOCAL_PREVIEW = ''; // Set to './assets/caught-in-the-rise-preview.mp3' after adding your clip.
const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
const audio = document.querySelector('#preview');
const previewStatus = document.querySelector('#preview-status');
const records = document.querySelector('#records');
const share = document.querySelector('#share');
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

if (today < RELEASE_DATE) {
  for (const link of document.querySelectorAll('[data-release-link]')) {
    link.textContent = 'Pre-save the single';
  }
} else {
  previewStatus.textContent = 'Use the listening link to find the single on your preferred service.';
}

function showPreview(source, message) {
  audio.src = source;
  audio.hidden = false;
  previewStatus.textContent = message;
}

audio.addEventListener('error', () => {
  audio.hidden = true;
  previewStatus.textContent = 'The audio preview is unavailable. Use the listening link to find the single.';
});

if (LOCAL_PREVIEW) showPreview(LOCAL_PREVIEW, 'Listen to a preview of “Caught in the Rise.”');

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
  link.className = 'text-link';
  link.href = release.url;
  link.textContent = 'Apple Music';
  link.setAttribute('aria-label', 'Listen to ' + release.title + ' on Apple Music');
  record.append(details, link);
  const next = [...records.children].find(row => row.dataset.date < release.date);
  records.insertBefore(record, next || null);
}

async function loadCatalog() {
  try {
    const response = await fetch('./api/catalog', { headers: { Accept: 'application/json' } });
    if (!response.ok) return;
    const { featured, releases } = await response.json();
    if (featured?.url) {
      const apple = document.querySelector('#featured-apple');
      apple.href = featured.url;
      apple.hidden = false;
      if (!LOCAL_PREVIEW && featured.preview) {
        showPreview(featured.preview, 'Listen to an Apple Music preview of “Caught in the Rise.”');
      }
    }
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
    const url = new URL('./', location.href).href;
    const status = document.querySelector('#share-status');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Sawyer Silas | Official Music', url });
      } else {
        await navigator.clipboard.writeText(url);
        status.textContent = 'Artist page link copied.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') status.textContent = 'Copy the link from your address bar.';
    }
  });
}

if (location.protocol.startsWith('http')) loadCatalog();
