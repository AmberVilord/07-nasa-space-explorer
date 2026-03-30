// Find the NeoWs date inputs, button, and gallery on the page
const neoStartInput = document.getElementById('neoStartDate');
const neoEndInput = document.getElementById('neoEndDate');
const neoButton = document.getElementById('neo-search-btn');
const neoGallery = document.getElementById('neo-gallery');

// Get today's date in YYYY-MM-DD format (required by date inputs)
const neoToday = new Date().toISOString().split('T')[0];

// Set up the date inputs with default values (last 7 days up to today)
neoStartInput.max = neoToday;
neoEndInput.max = neoToday;

const neoStartDefault = new Date();
neoStartDefault.setDate(neoStartDefault.getDate() - 6); // 6 days ago = 7-day range
neoStartInput.value = neoStartDefault.toISOString().split('T')[0];
neoEndInput.value = neoToday;

// When start date changes, automatically set end date to 6 days later (7-day max)
neoStartInput.addEventListener('change', () => {
  const startDate = new Date(neoStartInput.value);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);

  // Don't go past today
  const todayDate = new Date(neoToday);
  neoEndInput.value = endDate > todayDate
    ? neoToday
    : endDate.toISOString().split('T')[0];
});

// When the Search Asteroids button is clicked, fetch data from NASA's NeoWs API
neoButton.addEventListener('click', () => {
  const startDate = neoStartInput.value;
  const endDate = neoEndInput.value;

  // Show a loading message while we wait for the data
  neoGallery.innerHTML = '<p class="neo-loading">Loading asteroids...</p>';

  // Build the API URL with our selected date range
  // Note: The NeoWs API allows a maximum of 7 days between start_date and end_date
  const url = `https://api.nasa.gov/neo/rest/v1/feed?start_date=${startDate}&end_date=${endDate}&api_key=DEMO_KEY`;

  // Fetch the asteroid data from NASA
  fetch(url)
    .then(response => response.json())
    .then(data => {
      // The API groups asteroids by date, so we flatten them into one array
      const allAsteroids = [];
      for (const date in data.near_earth_objects) {
        allAsteroids.push(...data.near_earth_objects[date]);
      }

      // Sort by closest miss distance so the nearest asteroids appear first
      allAsteroids.sort((a, b) => {
        const distA = parseFloat(a.close_approach_data[0].miss_distance.kilometers);
        const distB = parseFloat(b.close_approach_data[0].miss_distance.kilometers);
        return distA - distB;
      });

      displayAsteroids(allAsteroids);
    })
    .catch(error => {
      // Show an error message if the fetch fails
      neoGallery.innerHTML = '<p class="neo-error">Error loading asteroid data. Please try again.</p>';
      console.error('NeoWs fetch error:', error);
    });
});

// Display a card for each asteroid in the neo-gallery
function displayAsteroids(asteroids) {
  // Clear any previous results
  neoGallery.innerHTML = '';

  // Show a message if no asteroids were found
  if (asteroids.length === 0) {
    neoGallery.innerHTML = `
      <div class="placeholder">
        <div class="placeholder-icon">🔍</div>
        <p>No asteroids found for this date range.</p>
      </div>`;
    return;
  }

  // Show a summary count at the top of the results
  const countEl = document.createElement('p');
  countEl.className = 'neo-count';
  countEl.textContent = `Found ${asteroids.length} near Earth objects`;
  neoGallery.appendChild(countEl);

  // Loop through each asteroid and create a card for it
  asteroids.forEach(asteroid => {
    // The close_approach_data array holds flyby details — we use the first entry
    const approach = asteroid.close_approach_data[0];
    const isHazardous = asteroid.is_potentially_hazardous_asteroid;
    const diameter = asteroid.estimated_diameter.kilometers;

    // Format large numbers with commas for readability (e.g. 1,234,567 km)
    const missDistance = Number(approach.miss_distance.kilometers).toLocaleString(undefined, {
      maximumFractionDigits: 0
    });
    const velocity = Number(approach.relative_velocity.kilometers_per_hour).toLocaleString(undefined, {
      maximumFractionDigits: 0
    });

    // Round the diameter to 3 decimal places
    const diamMin = diameter.estimated_diameter_min.toFixed(3);
    const diamMax = diameter.estimated_diameter_max.toFixed(3);

    // Create the card element and fill it with asteroid data
    const card = document.createElement('div');
    card.className = 'gallery-item neo-card';
    card.innerHTML = `
      <div class="neo-badge ${isHazardous ? 'neo-hazardous' : 'neo-safe'}">
        ${isHazardous ? '⚠️ Potentially Hazardous' : '✅ Safe'}
      </div>
      <h3 class="neo-name">${asteroid.name}</h3>
      <div class="neo-details">
        <p><span class="neo-label">Approach Date:</span> ${approach.close_approach_date}</p>
        <p><span class="neo-label">Miss Distance:</span> ${missDistance} km</p>
        <p><span class="neo-label">Velocity:</span> ${velocity} km/h</p>
        <p><span class="neo-label">Diameter:</span> ${diamMin} – ${diamMax} km</p>
      </div>
    `;

    neoGallery.appendChild(card);
  });
}
