// NASA Image and Video Library
// Uses the images-api.nasa.gov search endpoint to fetch media items.

const mediaQueryInput = document.getElementById('mediaQuery');
const mediaTypeSelect = document.getElementById('mediaType');
const mediaButton = document.getElementById('media-btn');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('space-fact-text');
const apodVideoCard = document.getElementById('apod-video-card');
const apodRegenerateButton = document.getElementById('apod-regenerate-btn');
const DEFAULT_MEDIA_QUERY = 'mars';
const MEDIA_CACHE_PREFIX = 'nasa-media-cache:';
const APOD_PODCAST_URL = 'https://www.youtube.com/@apodpodcast/videos';
const APOD_PODCAST_VIDEOS = [
  {
    title: '2026 March 29 - A Message from Earth',
    publishedAt: '2026-03-29',
    url: 'https://www.youtube.com/watch?v=CIfGf2-TuB0',
    summary: 'Source: APOD Podcast YouTube channel.'
  },
  {
    title: '2026 March 27 - Hickson 44 in Leo',
    publishedAt: '2026-03-27',
    url: 'https://www.youtube.com/watch?v=yEN6eu9jHKQ',
    summary: 'Source: APOD Podcast YouTube channel.'
  },
  {
    title: '2026 March 26 - Black Holes and Neutron Stars: 218 Mergers and Counting',
    publishedAt: '2026-03-26',
    url: 'https://www.youtube.com/watch?v=NgaZdXs2q5A',
    summary: 'Source: APOD Podcast YouTube channel.'
  }
];

// Modal elements
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalClose = document.getElementById('modal-close');
const themeToggleButton = document.getElementById('theme-toggle');
const menuToggleButton = document.getElementById('menu-toggle');
const nasaMenu = document.getElementById('nasa-menu');
const THEME_STORAGE_KEY = 'space-explorer-theme';
let currentApodVideoIndex = -1;

// Apply a visual theme and update the toggle label so users always know the next mode.
function applyTheme(theme) {
  const isLightMode = theme === 'light';

  document.body.classList.toggle('light-mode', isLightMode);

  if (themeToggleButton) {
    themeToggleButton.innerHTML = isLightMode ? 'Dark<br>Mode' : 'Light<br>Mode';
  }

  localStorage.setItem(THEME_STORAGE_KEY, isLightMode ? 'light' : 'dark');
}

// Start from saved mode. If nothing is saved, default to dark mode.
const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
applyTheme(savedTheme);

if (themeToggleButton) {
  themeToggleButton.addEventListener('click', () => {
    const currentIsLight = document.body.classList.contains('light-mode');
    applyTheme(currentIsLight ? 'dark' : 'light');
  });
}

function closeNasaMenu() {
  if (!nasaMenu || !menuToggleButton) {
    return;
  }

  nasaMenu.classList.remove('menu-open');
  menuToggleButton.setAttribute('aria-expanded', 'false');
}

if (menuToggleButton && nasaMenu) {
  menuToggleButton.addEventListener('click', () => {
    const isOpen = nasaMenu.classList.toggle('menu-open');
    menuToggleButton.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!nasaMenu.contains(event.target) && !menuToggleButton.contains(event.target)) {
      closeNasaMenu();
    }
  });

  nasaMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeNasaMenu);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNasaMenu();
    }
  });
}

// Close modal helpers
if (modalClose && modal) {
  modalClose.addEventListener('click', () => modal.classList.remove('modal-visible'));
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.classList.remove('modal-visible');
    }
  });
}

// Facts for the "Did You Know?" panel
const spaceFacts = [
  'A day on Venus is longer than a year on Venus. NASA Solar System Exploration.',
  'Jupiter has the shortest day of all planets in our solar system, about 10 hours. NASA Solar System Exploration.',
  'The Sun contains more than 99% of the mass in our solar system. NASA Solar System Exploration.',
  'The Milky Way is a spiral galaxy, and our solar system is located in one of its spiral arms. NASA Science.',
  'Neutron stars can spin very fast, and some are observed as pulsars. NASA Imagine the Universe.',
  'NASA and partner missions use space telescopes to study galaxies, stars, planets, and black holes. NASA Science.'
];

function showRandomSpaceFact() {
  const randomIndex = Math.floor(Math.random() * spaceFacts.length);
  spaceFactText.textContent = spaceFacts[randomIndex];
}

function getApiErrorMessage(data, fallbackMessage) {
  if (data && data.reason) {
    return data.reason;
  }

  if (data && data.error && data.error.message) {
    return data.error.message;
  }

  return fallbackMessage;
}

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(getApiErrorMessage(data, `API error ${response.status}: ${response.statusText}`));
  }

  return data;
}

function getMediaCacheKey(query, mediaType) {
  return `${MEDIA_CACHE_PREFIX}${query}::${mediaType || 'all'}`;
}

function writeMediaCache(query, mediaType, items) {
  localStorage.setItem(
    getMediaCacheKey(query, mediaType),
    JSON.stringify({ savedAt: Date.now(), items })
  );
}

function readMediaCache(query, mediaType) {
  const text = localStorage.getItem(getMediaCacheKey(query, mediaType));

  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && Array.isArray(parsed.items) ? parsed : null;
  } catch {
    return null;
  }
}

function openImageModal(url, title, date) {
  modalImg.src = url;
  modalImg.alt = title;
  modalTitle.textContent = title;
  modalDate.textContent = date || 'Date not provided';
  modal.classList.add('modal-visible');
}

function getPreviewImage(item) {
  const links = item.links || [];
  const imageLink = links.find(link => link.render === 'image' || link.href);
  return imageLink ? imageLink.href : '';
}

function getMediaLink(item, renderType) {
  const links = item.links || [];
  const match = links.find(link => link.render === renderType);
  return match ? match.href : '';
}

// Convert common YouTube URL formats into an embeddable URL.
function getYouTubeEmbedUrl(url) {
  if (!url) {
    return '';
  }

  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }

    if (host.includes('youtube.com')) {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.href;
      }

      if (parsed.pathname === '/watch') {
        const id = parsed.searchParams.get('v');
        return id ? `https://www.youtube.com/embed/${id}` : '';
      }
    }
  } catch {
    return '';
  }

  return '';
}

function getYouTubeVideoId(url) {
  const embedUrl = getYouTubeEmbedUrl(url);

  if (!embedUrl) {
    return '';
  }

  try {
    const parsed = new URL(embedUrl);
    return parsed.pathname.replace('/embed/', '');
  } catch {
    return '';
  }
}

function renderApodVideoEntry(entry) {
  const videoId = getYouTubeVideoId(entry.url);
  const thumbnailUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
  const mediaMarkup = thumbnailUrl
    ? `
      <a href="${entry.url}" target="_blank" rel="noreferrer" aria-label="Watch ${entry.title} on YouTube">
        <img src="${thumbnailUrl}" alt="${entry.title}" class="gallery-thumb" />
      </a>
    `
    : '';

  return `
    <article class="gallery-item apod-card">
      ${mediaMarkup}
      <div class="apod-card-copy">
        <p><strong>${entry.title}</strong></p>
        <p>${entry.publishedAt} • YouTube video</p>
        <p class="apod-explanation">${entry.summary}</p>
        <a class="eonet-link library-link apod-video-link" href="${entry.url}" target="_blank" rel="noreferrer">Watch on YouTube</a>
      </div>
    </article>
  `;
}

function getNextApodVideo() {
  if (!APOD_PODCAST_VIDEOS.length) {
    return null;
  }

  if (APOD_PODCAST_VIDEOS.length === 1) {
    currentApodVideoIndex = 0;
    return APOD_PODCAST_VIDEOS[0];
  }

  let nextIndex = Math.floor(Math.random() * APOD_PODCAST_VIDEOS.length);

  while (nextIndex === currentApodVideoIndex) {
    nextIndex = Math.floor(Math.random() * APOD_PODCAST_VIDEOS.length);
  }

  currentApodVideoIndex = nextIndex;
  return APOD_PODCAST_VIDEOS[nextIndex];
}

function loadApodVideo() {
  if (!apodVideoCard) {
    return;
  }
  const videoEntry = getNextApodVideo();

  if (!videoEntry) {
    apodVideoCard.innerHTML = '<p class="neo-error">No APOD Podcast videos are available right now.</p>';
    return;
  }

  apodVideoCard.innerHTML = renderApodVideoEntry(videoEntry);
}

async function getAssetLinks(nasaId) {
  const assetUrl = `https://images-api.nasa.gov/asset/${encodeURIComponent(nasaId)}`;
  const data = await fetchJson(assetUrl);
  return data.collection && data.collection.items ? data.collection.items : [];
}

function renderLibraryItems(items) {
  gallery.innerHTML = '';

  if (!items.length) {
    gallery.innerHTML = '<p class="neo-error">No NASA media results found for that search.</p>';
    return;
  }

  items.forEach((item) => {
    const meta = item.data && item.data[0] ? item.data[0] : {};
    const title = meta.title || 'Untitled NASA Media';
    const date = meta.date_created ? meta.date_created.slice(0, 10) : 'Date not provided';
    const mediaType = meta.media_type || 'unknown';
    const nasaId = meta.nasa_id || '';
    const thumb = getPreviewImage(item);
    const videoUrl = getMediaLink(item, 'video');
    const youtubeEmbedUrl = getYouTubeEmbedUrl(videoUrl);

    const card = document.createElement('div');
    card.className = 'gallery-item';

    // Handle videos clearly: embed YouTube when available, otherwise provide a direct link.
    let mediaMarkup = '';
    if (mediaType === 'video') {
      if (youtubeEmbedUrl) {
        mediaMarkup = `
          <div class="gallery-video-wrap">
            <iframe
              class="gallery-video"
              src="${youtubeEmbedUrl}"
              title="${title}"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        `;
      } else if (videoUrl) {
        mediaMarkup = `
          <p class="video-fallback">Video preview is not embeddable here.</p>
          <a class="eonet-link library-link" href="${videoUrl}" target="_blank" rel="noreferrer">Open Video</a>
        `;
      } else if (thumb) {
        mediaMarkup = `<img src="${thumb}" alt="${title}" class="gallery-thumb" />`;
      }
    } else if (thumb) {
      mediaMarkup = `<img src="${thumb}" alt="${title}" class="gallery-thumb" />`;
    }

    card.innerHTML = `
      ${mediaMarkup}
      <p><strong>${title}</strong></p>
      <p>${date} • ${mediaType}</p>
      <p>ID: ${nasaId || 'Not provided'}</p>
      <a class="eonet-link library-link" href="https://images.nasa.gov/details-${encodeURIComponent(nasaId)}" target="_blank" rel="noreferrer">Open in NASA Library</a>
    `;

    // For images, clicking the thumbnail tries to open a full image from /asset.
    if (mediaType === 'image' && nasaId && thumb) {
      const img = card.querySelector('img');
      img.addEventListener('click', async () => {
        try {
          const assets = await getAssetLinks(nasaId);
          const full = assets.find(a => /\.(jpg|jpeg|png|webp)$/i.test(a.href));
          openImageModal(full ? full.href : thumb, title, date);
        } catch {
          openImageModal(thumb, title, date);
        }
      });
    }

    gallery.appendChild(card);
  });
}

function showLibraryNotice(message) {
  const notice = document.createElement('p');
  notice.className = 'neo-loading';
  notice.style.padding = '12px';
  notice.textContent = message;
  gallery.prepend(notice);
}

async function runMediaSearch() {
  const q = mediaQueryInput.value.trim() || DEFAULT_MEDIA_QUERY;
  const mediaType = mediaTypeSelect.value;

  mediaQueryInput.value = q;

  const params = new URLSearchParams({ q });
  if (mediaType) {
    params.set('media_type', mediaType);
  }

  gallery.innerHTML = '<p class="neo-loading">🛰️ Searching NASA library...</p>';
  mediaButton.disabled = true;

  try {
    const url = `https://images-api.nasa.gov/search?${params.toString()}`;
    const data = await fetchJson(url);
    const items = data.collection && data.collection.items ? data.collection.items : [];

    // If a strict media filter returns no items, retry once without filter.
    if (items.length === 0 && mediaType) {
      const retryParams = new URLSearchParams({ q });
      const retryUrl = `https://images-api.nasa.gov/search?${retryParams.toString()}`;
      const retryData = await fetchJson(retryUrl);
      const retryItems = retryData.collection && retryData.collection.items ? retryData.collection.items : [];
      const finalRetryItems = retryItems.slice(0, 24);
      renderLibraryItems(finalRetryItems);
      writeMediaCache(q, '', finalRetryItems);
      showLibraryNotice('No exact media type match found. Showing all media results instead.');
      return;
    }

    const finalItems = items.slice(0, 24);
    renderLibraryItems(finalItems);
    writeMediaCache(q, mediaType, finalItems);
  } catch (error) {
    const cached = readMediaCache(q, mediaType) || readMediaCache(q, '');

    if (cached && cached.items.length) {
      renderLibraryItems(cached.items);
      showLibraryNotice('Live API request failed. Showing saved media results from an earlier successful search.');
      return;
    }

    gallery.innerHTML = `<p class="neo-error">❌ ${error.message} Try a broad query like "mars" or "apollo".</p>`;
  } finally {
    mediaButton.disabled = false;
  }
}

mediaButton.addEventListener('click', runMediaSearch);

// Pressing Enter in the search input runs the same search action.
mediaQueryInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    runMediaSearch();
  }
});

showRandomSpaceFact();
document.getElementById('new-fact-btn').addEventListener('click', showRandomSpaceFact);
loadApodVideo();

if (apodRegenerateButton) {
  apodRegenerateButton.addEventListener('click', loadApodVideo);
}

// On refresh, start with a clean search form so old browser-restored values do not reappear.
window.addEventListener('pageshow', () => {
  if (mediaQueryInput) {
    mediaQueryInput.value = '';
  }

  if (mediaTypeSelect) {
    mediaTypeSelect.value = '';
  }
});
