// NASA Image and Video Library
// Uses the images-api.nasa.gov search endpoint to fetch media items.

const mediaQueryInput = document.getElementById('mediaQuery');
const mediaTypeSelect = document.getElementById('mediaType');
const mediaButton = document.getElementById('media-btn');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('space-fact-text');
const DEFAULT_MEDIA_QUERY = 'mars';

// Modal elements
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalClose = document.getElementById('modal-close');

// Close modal helpers
modalClose.addEventListener('click', () => modal.classList.remove('modal-visible'));
modal.addEventListener('click', (event) => {
  if (event.target === modal) {
    modal.classList.remove('modal-visible');
  }
});

// Facts for the "Did You Know?" panel
const spaceFacts = [
  'NASA Image and Video Library includes historic Apollo mission media.',
  'You can search NASA media by mission names, objects, and keywords.',
  'Each NASA library item has a nasa_id you can use with the /asset endpoint.',
  'The /metadata endpoint returns a location for detailed metadata files.',
  'The NASA media library includes image, video, and audio content.',
  'Many NASA library images can be opened in full resolution from the asset manifest.'
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

    const card = document.createElement('div');
    card.className = 'gallery-item';
    card.innerHTML = `
      ${thumb ? `<img src="${thumb}" alt="${title}" class="gallery-thumb" />` : ''}
      <p><strong>${title}</strong></p>
      <p>${date} • ${mediaType}</p>
      <p>ID: ${nasaId || 'Not provided'}</p>
      <a class="eonet-link" href="https://images.nasa.gov/details-${encodeURIComponent(nasaId)}" target="_blank" rel="noreferrer">Open in NASA Library</a>
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
      renderLibraryItems(retryItems.slice(0, 24));
      return;
    }

    renderLibraryItems(items.slice(0, 24));
  } catch (error) {
    gallery.innerHTML = `<p class="neo-error">❌ ${error.message}</p>`;
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

// Give users an immediate working query so the first search succeeds.
mediaQueryInput.value = DEFAULT_MEDIA_QUERY;
