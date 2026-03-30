// EONET — Earth Observatory Natural Event Tracker
// Shows current natural events such as wildfires, storms, volcanoes, and floods.

const eonetStatusInput = document.getElementById('eonetStatus');
const eonetCategoryInput = document.getElementById('eonetCategory');
const eonetLimitInput = document.getElementById('eonetLimit');
const eonetButton = document.getElementById('eonet-btn');
const eonetGallery = document.getElementById('eonet-gallery');

// Convert the category title into a simple slug so filtering is consistent.
function slugifyCategory(text) {
  return text
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

// Build a readable place string from event coordinates.
function formatCoordinates(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) {
    return 'Location not provided';
  }

  const [longitude, latitude] = geometry.coordinates;

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return 'Location not provided';
  }

  return `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
}

// Render event cards for the EONET section.
function renderEonetEvents(events) {
  eonetGallery.innerHTML = '';

  if (!events.length) {
    eonetGallery.innerHTML = '<p class="neo-error">No natural events matched those filters.</p>';
    return;
  }

  events.forEach(event => {
    const latestGeometry = event.geometry[event.geometry.length - 1];
    const categories = event.categories.map(category => category.title).join(', ');
    const sourceLink = event.sources[0] ? event.sources[0].url : event.link;

    const card = document.createElement('div');
    card.className = 'gallery-item neo-card eonet-card';
    card.innerHTML = `
      <div class="neo-badge eonet-badge">🌍 ${event.closed ? 'Closed Event' : 'Open Event'}</div>
      <h3 class="neo-name">${event.title}</h3>
      <div class="neo-details">
        <p>🏷️ Category: <strong>${categories}</strong></p>
        <p>🕒 Latest Update: <strong>${latestGeometry.date}</strong></p>
        <p>📍 Coordinates: <strong>${formatCoordinates(latestGeometry)}</strong></p>
        <p>🔗 Sources: <strong>${event.sources.length}</strong></p>
      </div>
      <a class="eonet-link" href="${sourceLink}" target="_blank" rel="noreferrer">Open Event Source</a>
    `;

    eonetGallery.appendChild(card);
  });
}

// Fetch EONET events, filter by category in the browser, and render them.
eonetButton.addEventListener('click', async () => {
  const status = eonetStatusInput.value;
  const category = eonetCategoryInput.value;
  const limit = Number(eonetLimitInput.value) || 6;

  const params = new URLSearchParams({ limit: String(limit) });
  if (status !== 'all') {
    params.set('status', status);
  }

  eonetGallery.innerHTML = '<p class="neo-loading">🌍 Loading natural events...</p>';

  try {
    const response = await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    let events = data.events || [];

    if (category !== 'all') {
      events = events.filter(event =>
        event.categories.some(item => slugifyCategory(item.title) === category)
      );
    }

    renderEonetEvents(events);
  } catch (err) {
    eonetGallery.innerHTML = `<p class="neo-error">❌ ${err.message}</p>`;
  }
});
