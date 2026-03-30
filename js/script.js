// NeoWs — Near Earth Object Web Service
// Lets users search for asteroids, look up a specific asteroid, or browse the data-set

const neoModeSelect   = document.getElementById('neoMode');
const feedControls    = document.getElementById('feed-controls');
const lookupControls  = document.getElementById('lookup-controls');
const neoStartInput   = document.getElementById('neoStartDate');
const neoEndInput     = document.getElementById('neoEndDate');
const neoIdInput      = document.getElementById('neoAsteroidId');
const neoButton       = document.getElementById('neo-btn');
const gallery         = document.getElementById('gallery');
const spaceFactText   = document.getElementById('space-fact-text');
const NEO_API_KEY     = 'DEMO_KEY';

// Modal elements
const modal      = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalDate  = document.getElementById('modal-date');
const modalClose = document.getElementById('modal-close');

// Close modal helpers
modalClose.addEventListener('click', () => modal.classList.remove('modal-visible'));
modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('modal-visible'); });

// Space weather facts shown in the Did You Know panel
const spaceFacts = [
  'More than 2,000 asteroids pass closer to Earth than the Moon each year.',
  'The asteroid Bennu has a 1-in-2,700 chance of hitting Earth in 2182.',
  'NASA’s DART mission successfully changed an asteroid’s orbit in 2022.',
  'Asteroid 433 Eros was the first to be orbited and landed on by a spacecraft.',
  'Most near-Earth asteroids are remnants from the early solar system, over 4.5 billion years old.',
  'The asteroid belt between Mars and Jupiter contains over a million asteroids.',
  'Some asteroids have their own small moons orbiting them.',
  'Potentially hazardous asteroids (PHAs) are tracked by NASA’s Center for Near Earth Object Studies.',
  'Vesta is the second-largest object in the asteroid belt and has its own mountain — taller than Everest.',
  'The Chelyabinsk meteor in 2013 released 30 times more energy than the Hiroshima atomic bomb.'
];

function showRandomSpaceFact() {
  const index = Math.floor(Math.random() * spaceFacts.length);
  spaceFactText.textContent = spaceFacts[index];
}

function getApiErrorMessage(data, fallbackMessage) {
  if (data && typeof data.error_message === 'string' && data.error_message.trim()) {
    return data.error_message;
  }

  if (data && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  return fallbackMessage;
}

function getNeoCacheKey(url) {
  return `neo-cache:${url}`;
}

function readNeoCache(url) {
  const cachedText = localStorage.getItem(getNeoCacheKey(url));

  if (!cachedText) {
    return null;
  }

  try {
    return JSON.parse(cachedText);
  } catch {
    localStorage.removeItem(getNeoCacheKey(url));
    return null;
  }
}

function writeNeoCache(url, data) {
  localStorage.setItem(getNeoCacheKey(url), JSON.stringify(data));
}

async function fetchNeoWsJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (response.ok) {
    writeNeoCache(url, data);
    return data;
  }

  if (response.status === 429) {
    const cachedData = readNeoCache(url);

    if (cachedData) {
      return cachedData;
    }

    throw new Error('NeoWs is rate-limited right now. Wait a minute and try again.');
  }

  throw new Error(getApiErrorMessage(data, `API error ${response.status}: ${response.statusText}`));
}

// Show/hide search controls based on selected mode
neoModeSelect.addEventListener('change', () => {
  const mode = neoModeSelect.value;
  feedControls.style.display   = mode === 'feed'   ? 'contents' : 'none';
  lookupControls.style.display = mode === 'lookup' ? 'contents' : 'none';
});

// Format a Date as YYYY-MM-DD in local time
function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Default date range for the Feed mode: last 7 days ending today.
// This is more reliable than searching into the future, where there may be no events.
const today = new Date();
const weekAgo = new Date(today);
weekAgo.setDate(today.getDate() - 7);
neoStartInput.value = formatLocalDate(weekAgo);
neoEndInput.value = formatLocalDate(today);

function getPrimaryApproach(asteroid) {
  if (!asteroid.close_approach_data || !asteroid.close_approach_data.length) {
    return null;
  }

  return asteroid.close_approach_data[0];
}

function getDiameterText(asteroid) {
  const diamMin = asteroid.estimated_diameter?.meters?.estimated_diameter_min;
  const diamMax = asteroid.estimated_diameter?.meters?.estimated_diameter_max;

  if (typeof diamMin !== 'number' || typeof diamMax !== 'number') {
    return 'Unknown';
  }

  return `~${((diamMin + diamMax) / 2).toFixed(0)} m`;
}

// Build and display asteroid cards
function renderAsteroids(asteroids) {
  gallery.innerHTML = '';

  if (!asteroids.length) {
    gallery.innerHTML = '<p class="neo-error">No asteroids found for this search.</p>';
    return;
  }

  asteroids.forEach(asteroid => {
    const approach = getPrimaryApproach(asteroid);
    const missKm = approach
      ? Number(approach.miss_distance.kilometers).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : 'Unknown';
    const velocityKph = approach
      ? Number(approach.relative_velocity.kilometers_per_hour).toLocaleString(undefined, { maximumFractionDigits: 0 })
      : 'Unknown';
    const approachDate = approach ? approach.close_approach_date : 'No close approach data';
    const diamText = getDiameterText(asteroid);
    const isHazardous = asteroid.is_potentially_hazardous_asteroid;

    const card = document.createElement('div');
    card.className = 'gallery-item neo-card';
    card.innerHTML = `
      <div class="neo-badge ${isHazardous ? 'neo-hazardous' : 'neo-safe'}">
        ${isHazardous ? '⚠️ Potentially Hazardous' : '✓ Safe Approach'}
      </div>
      <h3 class="neo-name">${asteroid.name}</h3>
      <div class="neo-details">
        <p>📅 Close Approach: <strong>${approachDate}</strong></p>
        <p>📏 Est. Diameter: <strong>${diamText}</strong></p>
        <p>🚀 Velocity: <strong>${velocityKph} km/h</strong></p>
        <p>🌍 Miss Distance: <strong>${missKm} km</strong></p>
        <p>🆔 SPK-ID: <strong>${asteroid.neo_reference_id}</strong></p>
      </div>
    `;

    gallery.appendChild(card);
  });
}

// Handle the search button click for all three NeoWs modes
neoButton.addEventListener('click', async () => {
  const mode   = neoModeSelect.value;
  let url;

  // Build the correct URL for the selected mode
  if (mode === 'feed') {
    const start = neoStartInput.value;
    const end   = neoEndInput.value;
    if (!start || !end) {
      gallery.innerHTML = '<p class="neo-error">Please select both a start and end date.</p>';
      return;
    }

    const rangeDays = Math.round((new Date(end) - new Date(start)) / 86400000);
    if (rangeDays < 0) {
      gallery.innerHTML = '<p class="neo-error">End date must be on or after the start date.</p>';
      return;
    }

    if (rangeDays > 7) {
      gallery.innerHTML = '<p class="neo-error">NeoWs feed searches are limited to 7 days.</p>';
      return;
    }

    url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${start}&end_date=${end}&api_key=${NEO_API_KEY}`;
  } else if (mode === 'lookup') {
    const id = neoIdInput.value.trim();
    if (!id) {
      gallery.innerHTML = '<p class="neo-error">Please enter an Asteroid SPK-ID.</p>';
      return;
    }
    url = `https://api.nasa.gov/neo/rest/v1/neo/${encodeURIComponent(id)}?api_key=${NEO_API_KEY}`;
  } else {
    // Browse mode
    url = `https://api.nasa.gov/neo/rest/v1/neo/browse?api_key=${NEO_API_KEY}`;
  }

  gallery.innerHTML = '<p class="neo-loading">☄️ Scanning the asteroid belt…</p>';

  try {
    const data = await fetchNeoWsJson(url);

    let asteroids;
    if (mode === 'feed') {
      // Feed returns a map of date → array; flatten into one list sorted by miss distance
      asteroids = Object.values(data.near_earth_objects).flat();
      asteroids.sort((a, b) =>
        Number(getPrimaryApproach(a)?.miss_distance?.kilometers || Number.POSITIVE_INFINITY) -
        Number(getPrimaryApproach(b)?.miss_distance?.kilometers || Number.POSITIVE_INFINITY)
      );
    } else if (mode === 'lookup') {
      // Lookup returns a single object
      asteroids = [data];
    } else {
      // Browse returns { near_earth_objects: [...] }
      asteroids = data.near_earth_objects || [];
    }

    renderAsteroids(asteroids);
  } catch (err) {
    gallery.innerHTML = `<p class="neo-error">❌ ${err.message}</p>`;
  }
});

// Show a random space fact on load and wire up the New Fact button
showRandomSpaceFact();
document.getElementById('new-fact-btn').addEventListener('click', showRandomSpaceFact);
