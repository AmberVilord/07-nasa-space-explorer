// Find our date picker inputs, button, and gallery on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const apodButton = document.getElementById('apod-btn');
const gallery = document.getElementById('gallery');
const spaceFactText = document.getElementById('space-fact-text');

// Fun facts shown above the APOD gallery
const spaceFacts = [
  'A day on Venus is longer than a year on Venus.',
  'Neutron stars can spin at more than 600 rotations per second.',
  'Jupiter has the shortest day of all planets: about 10 hours.',
  'The footprints left on the Moon can last for millions of years.',
  'One million Earths could fit inside the Sun.',
  'Saturn would float in water because it is less dense than water.'
];

function showRandomSpaceFact() {
  const randomIndex = Math.floor(Math.random() * spaceFacts.length);
  spaceFactText.textContent = spaceFacts[randomIndex];
}

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);
showRandomSpaceFact();

// When the button is clicked, fetch images from NASA's APOD API
apodButton.addEventListener('click', () => {
  const startDate = startInput.value;
  const endDate = endInput.value;

  // Show a loading message while we wait for the data
  gallery.innerHTML = '<p class="neo-loading">🔄 Loading space photos…</p>';

  // Build the API URL using the selected date range
  const url = `https://api.nasa.gov/planetary/apod?start_date=${startDate}&end_date=${endDate}&api_key=DEMO_KEY`;

  // Fetch the image data from NASA
  fetch(url)
    .then(response => response.json())
    .then(data => {
      displayImages(data);
    })
    .catch(error => {
      // Show an error message if the fetch fails
      gallery.innerHTML = '<p class="neo-error">Error loading images. Please try again.</p>';
      console.error('APOD fetch error:', error);
    });
});

// Set up the lightbox modal — grab its elements once for reuse
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modal-img');
const modalVideo = document.getElementById('modal-video');
const modalTitle = document.getElementById('modal-title');
const modalDate = document.getElementById('modal-date');
const modalExplanation = document.getElementById('modal-explanation');
const modalClose = document.getElementById('modal-close');

// Convert a YouTube watch URL to an embed URL so it can be used in an <iframe>
// Handles both https://www.youtube.com/watch?v=ID and https://youtu.be/ID formats
function getYouTubeEmbedUrl(url) {
  let videoId = null;

  // Match the standard watch?v= format
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }

  // Match the short youtu.be/ID format
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }

  // Return an embed URL if we found an ID, otherwise return the original URL
  return videoId
    ? `https://www.youtube.com/embed/${videoId}`
    : url;
}

// Close the modal when the ✕ button is clicked
modalClose.addEventListener('click', () => {
  modal.classList.remove('modal-visible');
  // Stop the video from playing in the background when the modal closes
  modalVideo.innerHTML = '';
});

// Also close the modal when the user clicks the dark backdrop
modal.addEventListener('click', (event) => {
  // Only close if the click was on the backdrop, not the image content
  if (event.target === modal) {
    modal.classList.remove('modal-visible');
    // Stop the video from playing in the background when the modal closes
    modalVideo.innerHTML = '';
  }
});

// Open the modal with the selected item details
function openModal(item) {
  modalTitle.textContent = item.title;
  modalDate.textContent = item.date;
  modalExplanation.textContent = item.explanation;

  if (item.media_type === 'image') {
    // Show the image and hide the video wrapper
    modalImg.src = item.url;
    modalImg.alt = item.title;
    modalImg.style.display = 'block';
    modalVideo.innerHTML = '';
    modalVideo.style.display = 'none';
  } else {
    // Show an embedded video and hide the image
    const embedUrl = getYouTubeEmbedUrl(item.url);
    modalVideo.innerHTML = `<iframe src="${embedUrl}" allowfullscreen title="${item.title}"></iframe>`;
    modalVideo.style.display = 'block';
    modalImg.src = '';
    modalImg.style.display = 'none';
  }

  modal.classList.add('modal-visible');
}

// Take the array of items from the API and build a gallery card for each one
function displayImages(items) {
  // Clear the placeholder (or any previous results)
  gallery.innerHTML = '';

  // Loop through each item returned by the API
  items.forEach(item => {
    // Create a card element for this item
    const card = document.createElement('div');
    card.className = 'gallery-item';

    // Some APOD entries are videos (e.g. YouTube) — handle both cases
    if (item.media_type === 'image') {
      card.innerHTML = `
        <img src="${item.url}" alt="${item.title}" class="gallery-thumb" />
        <p><strong>${item.title}</strong></p>
        <p>${item.date}</p>
      `;

      // Make the thumbnail clickable to open the lightbox
      const img = card.querySelector('img');
      img.addEventListener('click', () => {
        openModal(item);
      });
    } else {
      // For video entries, embed the video directly using an <iframe>
      const embedUrl = getYouTubeEmbedUrl(item.url);
      card.innerHTML = `
        <div class="gallery-video-wrapper">
          <iframe src="${embedUrl}" allowfullscreen title="${item.title}"></iframe>
        </div>
        <p><strong>${item.title}</strong></p>
        <p>${item.date}</p>
      `;

      // Clicking the text area below the video opens the modal with the explanation
      card.addEventListener('click', (event) => {
        // Only open the modal if the user clicked outside the iframe itself
        if (event.target.tagName !== 'IFRAME') {
          openModal(item);
        }
      });
    }

    gallery.appendChild(card);
  });
}
