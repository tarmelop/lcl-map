// Language state
let currentLang = localStorage.getItem('language') || 'en';
let isAdmin = false;
let allPinsData = [];

// Initialize the map
const map = L.map('map', {
    maxZoom: 19,
    minZoom: 2
}).setView([20, 0], 2);

// Store current tile layer
let currentTileLayer = null;

// Configuration loaded from server
let USE_MAPTILER = true;
let MAPTILER_API_KEY = '';

// Language mapping for MapTiler
const langToMapTilerLang = {
    'en': 'en',
    'it': 'it',
    'es': 'es',
    'pt': 'pt',
    'ar': 'ar',
    'fr': 'fr',
    'tr': 'tr',
    'ja': 'ja'
};

// Function to update map tiles based on language
function updateMapTiles() {
    if (currentTileLayer) {
        map.removeLayer(currentTileLayer);
    }

    if (USE_MAPTILER && MAPTILER_API_KEY && MAPTILER_API_KEY !== 'YOUR_API_KEY_HERE' && MAPTILER_API_KEY !== '') {
        // Use MapTiler with language support
        const mapLang = langToMapTilerLang[currentLang] || 'en';
        console.log('Using MapTiler with key:', MAPTILER_API_KEY.substring(0, 5) + '...', 'language:', mapLang);
        currentTileLayer = L.tileLayer(
            `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_API_KEY}&language=${mapLang}`,
            {
                attribution: '© <a href="https://www.maptiler.com/copyright/">MapTiler</a> © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19
            }
        ).addTo(map);
    } else {
        // Use standard OpenStreetMap tiles (free, no API key needed)
        // Shows place names in their native/local language
        console.log('Using OpenStreetMap tiles');
        currentTileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19
        }).addTo(map);
    }
}

// Load configuration and initialize
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        const config = await response.json();
        USE_MAPTILER = config.useMapTiler;
        MAPTILER_API_KEY = config.mapTilerApiKey;
        console.log('Config loaded - useMapTiler:', USE_MAPTILER, 'API key:', MAPTILER_API_KEY ? MAPTILER_API_KEY.substring(0, 5) + '...' : 'none');
        updateMapTiles();
    } catch (error) {
        console.error('Error loading config:', error);
        updateMapTiles(); // Fall back to default
    }
}

// Initialize map tiles after loading config
loadConfig();

// Initialize marker cluster group
const markerCluster = L.markerClusterGroup({
    chunkedLoading: true,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
});
map.addLayer(markerCluster);

// Store markers
const markers = {};

// Modal elements
const modal = document.getElementById('modal');
const addBtn = document.getElementById('addBtn');
const closeBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const pinForm = document.getElementById('pinForm');
const deleteBtn = document.getElementById('deleteBtn');
const successMessage = document.getElementById('successMessage');
const modalTitle = document.getElementById('modalTitle');

// Admin modal elements
const adminModal = document.getElementById('adminModal');
const adminCloseBtn = document.querySelector('.admin-close');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminLogin = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const adminLogoutBtn = document.getElementById('adminLogoutBtn');
const adminPinList = document.getElementById('adminPinList');
const adminSearch = document.getElementById('adminSearch');
const adminCount = document.getElementById('adminCount');

// Store all admin pins for filtering
let allAdminPins = [];

// Store admin password after successful login
let adminPassword = '';

// Form elements
const nameInput = document.getElementById('name');
const forumUsernameInput = document.getElementById('forumUsername');
const greetingInput = document.getElementById('greeting');
const locationInput = document.getElementById('location');
const pinColorInput = document.getElementById('pinColor');
const randomColorBtn = document.getElementById('randomColorBtn');
const latInput = document.getElementById('lat');
const lngInput = document.getElementById('lng');
const editTokenInput = document.getElementById('editToken');
const locationSuggestions = document.getElementById('locationSuggestions');
const editLinkInput = document.getElementById('editLink');
const copyBtn = document.getElementById('copyBtn');

// Language selector
const languageSelector = document.getElementById('languageSelector');

// Counter
const participantCount = document.getElementById('participantCount');

// Debounce function for autocomplete
let searchTimeout;

// Load all pins on page load
loadPins();

// Generate random color
function getRandomColor() {
    const colors = [
        '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
        '#1abc9c', '#e67e22', '#34495e', '#16a085', '#c0392b',
        '#f1c40f', '#8e44ad', '#27ae60', '#2980b9', '#d35400'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Set random color on page load
pinColorInput.value = getRandomColor();

// Event listeners
addBtn.addEventListener('click', () => openModal());
closeBtn.addEventListener('click', closeModal);
cancelBtn.addEventListener('click', closeModal);
pinForm.addEventListener('submit', handleSubmit);
deleteBtn.addEventListener('click', handleDelete);
copyBtn.addEventListener('click', copyEditLink);
randomColorBtn.addEventListener('click', () => {
    pinColorInput.value = getRandomColor();
});

// Admin event listeners
adminCloseBtn.addEventListener('click', closeAdminModal);
adminLoginForm.addEventListener('submit', handleAdminLogin);
adminLogoutBtn.addEventListener('click', handleAdminLogout);
adminSearch.addEventListener('input', filterAdminPins);

// Password toggle
const togglePasswordBtn = document.getElementById('togglePassword');
const adminPasswordInput = document.getElementById('adminPassword');
togglePasswordBtn.addEventListener('click', () => {
    const type = adminPasswordInput.type === 'password' ? 'text' : 'password';
    adminPasswordInput.type = type;

    // Toggle SVG icon visibility
    const openPaths = togglePasswordBtn.querySelectorAll('.eye-open');
    const closedPaths = togglePasswordBtn.querySelectorAll('.eye-closed');

    if (type === 'text') {
        openPaths.forEach(path => path.style.display = 'none');
        closedPaths.forEach(path => path.style.display = 'block');
    } else {
        openPaths.forEach(path => path.style.display = 'block');
        closedPaths.forEach(path => path.style.display = 'none');
    }
});

// Language selector
languageSelector.value = currentLang;
languageSelector.addEventListener('change', (e) => {
    currentLang = e.target.value;
    localStorage.setItem('language', currentLang);
    updateUILanguage();

    // Update HTML lang attribute
    document.documentElement.lang = currentLang;

    // Update direction for RTL languages
    document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

    // Update map tiles for new language
    updateMapTiles();
});

// Initialize language
updateUILanguage();
document.documentElement.lang = currentLang;
document.body.dir = currentLang === 'ar' ? 'rtl' : 'ltr';

// Check for admin in URL immediately
const urlParams = new URLSearchParams(window.location.search);
const isAdminUrl = urlParams.get('admin') !== null;
if (isAdminUrl) {
    // Open admin modal after a short delay to ensure DOM is ready
    setTimeout(() => {
        openAdminModal();
    }, 100);
}

// Location autocomplete
locationInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    if (query.length < 3) {
        locationSuggestions.innerHTML = '';
        return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
        try {
            const langParam = currentLang !== 'en' ? `&accept-language=${currentLang}` : '';
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=10&featuretype=settlement${langParam}`);
            const results = await response.json();

            displaySuggestions(results);
        } catch (error) {
            console.error('Error fetching location suggestions:', error);
        }
    }, 300);
});

function displaySuggestions(results) {
    const t = translations[currentLang];

    if (results.length === 0) {
        locationSuggestions.innerHTML = `<div class="suggestion-item">${t.noResults}</div>`;
        return;
    }

    locationSuggestions.innerHTML = results.map(result =>
        `<div class="suggestion-item" data-lat="${result.lat}" data-lng="${result.lon}" data-name="${result.display_name}">
            ${result.display_name}
        </div>`
    ).join('');

    // Add click listeners to suggestions
    document.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', () => {
            locationInput.value = item.dataset.name;
            latInput.value = item.dataset.lat;
            lngInput.value = item.dataset.lng;
            locationSuggestions.innerHTML = '';
        });
    });
}

async function loadPins() {
    try {
        const response = await fetch('/api/pins');
        const pins = await response.json();

        allPinsData = pins;

        console.log('Loaded pins:', pins.length, 'pins');

        // Update counter
        participantCount.textContent = pins.length;

        pins.forEach(pin => {
            console.log('Adding pin to map:', pin.name, 'at', pin.lat, pin.lng);
            addMarkerToMap(pin);
        });
    } catch (error) {
        console.error('Error loading pins:', error);
    }
}

function addMarkerToMap(pin) {
    // Create custom colored icon
    const pinColor = pin.color || '#3498db';
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${pinColor}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 24]
    });

    const marker = L.marker([pin.lat, pin.lng], { icon: customIcon });

    // Admin edit button in popup (only if admin and editToken is available)
    const adminEditButton = (isAdmin && pin.editToken) ? `<button class="btn btn-small btn-primary" onclick="editPinFromMap('${pin.editToken}')" style="margin-top: 0.5rem;">Edit Pin</button>` : '';

    const forumLink = pin.forumUsername
        ? `<a class="forum-link" href="https://lcl-forum.media.mit.edu/u/${encodeURIComponent(pin.forumUsername)}/summary" target="_blank" rel="noopener">@${escapeHtml(pin.forumUsername)}</a>`
        : '';

    const popupContent = `
        <div class="popup-content">
            <h3>${escapeHtml(pin.name)}</h3>
            ${forumLink}
            ${pin.greeting ? `<p class="pin-greeting">${escapeHtml(pin.greeting)}</p>` : ''}
            ${pin.about ? `<p>${escapeHtml(pin.about)}</p>` : ''}
            <small>${escapeHtml(pin.location)}</small>
            ${adminEditButton}
        </div>
    `;

    marker.bindPopup(popupContent);
    markers[pin.id] = marker;
    markerCluster.addLayer(marker);
    console.log('Marker added for:', pin.name, 'Cluster has', markerCluster.getLayers().length, 'markers');
}

function openModal(pin = null) {
    const t = translations[currentLang];

    modal.style.display = 'block';
    successMessage.style.display = 'none';
    pinForm.style.display = 'block';

    if (pin) {
        // Edit mode
        modalTitle.textContent = t.modalTitleEdit;
        nameInput.value = pin.name;
        forumUsernameInput.value = pin.forumUsername || '';
        greetingInput.value = pin.greeting || '';
        locationInput.value = pin.location;
        pinColorInput.value = pin.color || '#3498db';
        latInput.value = pin.lat;
        lngInput.value = pin.lng;
        editTokenInput.value = pin.editToken;
        deleteBtn.style.display = 'inline-block';
    } else {
        // Add mode
        modalTitle.textContent = t.modalTitleAdd;
        pinForm.reset();
        pinColorInput.value = getRandomColor();
        editTokenInput.value = '';
        deleteBtn.style.display = 'none';
    }
}

function closeModal() {
    modal.style.display = 'none';
    pinForm.reset();
    locationSuggestions.innerHTML = '';
}

async function handleSubmit(e) {
    e.preventDefault();
    const t = translations[currentLang];

    const rawUsername = forumUsernameInput.value.trim().replace(/^@/, '');
    if (rawUsername && !/^[a-zA-Z0-9._-]+$/.test(rawUsername)) {
        alert(t.forumUsernameInvalid);
        forumUsernameInput.focus();
        return;
    }

    const pinData = {
        name: nameInput.value,
        forumUsername: rawUsername,
        greeting: greetingInput.value.trim(),
        location: locationInput.value,
        color: pinColorInput.value,
        lat: parseFloat(latInput.value),
        lng: parseFloat(lngInput.value),
        editToken: editTokenInput.value || undefined
    };

    if (!pinData.lat || !pinData.lng) {
        alert(t.selectLocation);
        return;
    }

    try {
        const url = pinData.editToken ? `/api/pins/${pinData.editToken}` : '/api/pins';
        const method = pinData.editToken ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pinData)
        });

        if (!response.ok) {
            throw new Error('Failed to save pin');
        }

        const result = await response.json();

        // Remove old marker if editing
        if (pinData.editToken && markers[result.id]) {
            markerCluster.removeLayer(markers[result.id]);
            delete markers[result.id];
        }

        // Clear and reload all pins
        markerCluster.clearLayers();
        Object.keys(markers).forEach(key => delete markers[key]);
        await loadPins();

        // Show success message with edit link
        if (!pinData.editToken) {
            const editUrl = `${window.location.origin}/?edit=${result.editToken}`;
            editLinkInput.value = editUrl;
            pinForm.style.display = 'none';
            successMessage.style.display = 'block';
        } else {
            closeModal();
            if (isAdmin) {
                loadAdminPins();
            }
        }

    } catch (error) {
        console.error('Error saving pin:', error);
        alert(t.saveFailed);
    }
}

async function handleDelete() {
    const t = translations[currentLang];

    if (!confirm(t.deleteConfirm)) {
        return;
    }

    const token = editTokenInput.value;

    try {
        const response = await fetch(`/api/pins/${token}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete pin');
        }

        const result = await response.json();

        // Remove marker from map
        if (markers[result.id]) {
            markerCluster.removeLayer(markers[result.id]);
            delete markers[result.id];
        }

        // Clear and reload all pins
        markerCluster.clearLayers();
        Object.keys(markers).forEach(key => delete markers[key]);
        await loadPins();

        closeModal();

        if (isAdmin) {
            loadAdminPins();
        }
    } catch (error) {
        console.error('Error deleting pin:', error);
        alert(t.deleteFailed);
    }
}

function copyEditLink() {
    const t = translations[currentLang];

    editLinkInput.select();
    document.execCommand('copy');
    copyBtn.textContent = t.copiedButton;
    setTimeout(() => {
        copyBtn.textContent = t.copyButton;
    }, 2000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Admin functions
function openAdminModal() {
    adminModal.style.display = 'block';
    if (isAdmin) {
        adminLogin.style.display = 'none';
        adminPanel.style.display = 'block';
        loadAdminPins();
    } else {
        adminLogin.style.display = 'block';
        adminPanel.style.display = 'none';
    }
}

function closeAdminModal() {
    adminModal.style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const t = translations[currentLang];

    const password = document.getElementById('adminPassword').value;

    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        if (response.ok) {
            isAdmin = true;
            adminPassword = password; // Store password for future requests
            adminLogin.style.display = 'none';
            adminPanel.style.display = 'block';
            await loadAdminPins();
            // Refresh map markers with editTokens to show edit buttons
            await refreshMapMarkersWithEditTokens();
        } else {
            alert(t.adminInvalidPassword);
        }
    } catch (error) {
        console.error('Error logging in:', error);
        alert(t.adminInvalidPassword);
    }
}

function handleAdminLogout() {
    isAdmin = false;
    adminPassword = ''; // Clear stored password
    adminPanel.style.display = 'none';
    adminLogin.style.display = 'block';
    document.getElementById('adminPassword').value = '';
    // Refresh map markers to hide edit buttons
    refreshMapMarkers();
}

function refreshMapMarkers() {
    // Clear and reload all markers with updated admin state
    markerCluster.clearLayers();
    Object.keys(markers).forEach(key => delete markers[key]);

    allPinsData.forEach(pin => {
        addMarkerToMap(pin);
    });
}

async function refreshMapMarkersWithEditTokens() {
    // When admin logs in, merge editTokens from admin pins into map data
    if (isAdmin && allAdminPins.length > 0) {
        // Create a map of id -> editToken
        const tokenMap = {};
        allAdminPins.forEach(adminPin => {
            tokenMap[adminPin.id] = adminPin.editToken;
        });

        // Update allPinsData with editTokens
        allPinsData = allPinsData.map(pin => ({
            ...pin,
            editToken: tokenMap[pin.id] || pin.editToken
        }));

        // Refresh markers
        refreshMapMarkers();
    }
}

async function loadAdminPins() {
    const t = translations[currentLang];

    try {
        const response = await fetch('/api/admin/pins', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: adminPassword })
        });

        if (!response.ok) {
            throw new Error('Failed to load admin pins');
        }

        const pins = await response.json();
        allAdminPins = pins;

        if (pins.length === 0) {
            adminPinList.innerHTML = `<p class="no-pins">${t.adminNoPin}</p>`;
            adminCount.textContent = '';
            return;
        }

        renderAdminPins(pins);
    } catch (error) {
        console.error('Error loading admin pins:', error);
    }
}

function renderAdminPins(pins) {
    const t = translations[currentLang];

    adminCount.textContent = `${pins.length} pin${pins.length !== 1 ? 's' : ''}`;

    if (pins.length === 0) {
        adminPinList.innerHTML = `<p class="no-pins">No pins match your search</p>`;
        return;
    }

    adminPinList.innerHTML = pins.map(pin => `
        <div class="admin-pin-item" data-id="${pin.id}" data-name="${escapeHtml(pin.name).toLowerCase()}" data-location="${escapeHtml(pin.location).toLowerCase()}">
            <div class="admin-pin-info">
                <strong>${escapeHtml(pin.name)}</strong>
                <p>${escapeHtml(pin.location)}</p>
                ${pin.about ? `<p class="admin-about">${escapeHtml(pin.about)}</p>` : ''}
            </div>
            <div class="admin-pin-actions">
                <button class="btn btn-small btn-primary admin-edit-btn" data-token="${pin.editToken}">${t.adminEditPin}</button>
                <button class="btn btn-small btn-danger admin-delete-btn" data-token="${pin.editToken}" data-id="${pin.id}">${t.adminDeletePin}</button>
            </div>
        </div>
    `).join('');

    // Add event listeners
    document.querySelectorAll('.admin-edit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const token = btn.dataset.token;
            await editPinFromToken(token);
        });
    });

    document.querySelectorAll('.admin-delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm(t.adminDeleteConfirm)) {
                return;
            }

            const token = btn.dataset.token;
            const id = btn.dataset.id;

            try {
                const response = await fetch(`/api/pins/${token}`, {
                    method: 'DELETE'
                });

                if (!response.ok) {
                    throw new Error('Failed to delete pin');
                }

                // Remove marker from map
                if (markers[id]) {
                    markerCluster.removeLayer(markers[id]);
                    delete markers[id];
                }

                // Clear and reload all pins
                markerCluster.clearLayers();
                Object.keys(markers).forEach(key => delete markers[key]);
                await loadPins();
                loadAdminPins();
            } catch (error) {
                console.error('Error deleting pin:', error);
                alert(t.deleteFailed);
            }
        });
    });
}

function filterAdminPins() {
    const searchTerm = adminSearch.value.toLowerCase().trim();

    if (!searchTerm) {
        renderAdminPins(allAdminPins);
        return;
    }

    const filtered = allAdminPins.filter(pin => {
        const name = pin.name.toLowerCase();
        const location = pin.location.toLowerCase();
        const about = (pin.about || '').toLowerCase();

        return name.includes(searchTerm) ||
               location.includes(searchTerm) ||
               about.includes(searchTerm);
    });

    renderAdminPins(filtered);
}

async function editPinFromToken(token) {
    try {
        const response = await fetch(`/api/pins/${token}`);
        if (response.ok) {
            const pin = await response.json();
            closeAdminModal();
            openModal(pin);
        }
    } catch (error) {
        console.error('Error loading pin:', error);
    }
}

// Global function for editing from map popup
window.editPinFromMap = async function(token) {
    await editPinFromToken(token);
}

function updateUILanguage() {
    const t = translations[currentLang];

    // Header
    document.getElementById('pageTitle').textContent = t.title;
    document.getElementById('participantLabel').textContent = t.participants;
    addBtn.textContent = t.addYourself;

    // Form labels
    document.querySelector('label[for="name"]').textContent = `${t.nameLabel} *`;
    document.querySelector('label[for="forumUsername"]').textContent = t.forumUsernameLabel;
    document.getElementById('greetingLabel').textContent = t.greetingLabel;
    document.getElementById('greetingHint').textContent = t.greetingHint;
    document.querySelector('label[for="location"]').textContent = `${t.locationLabel} *`;
    document.querySelector('label[for="pinColor"]').textContent = t.pinColorLabel;
    locationInput.placeholder = t.locationPlaceholder;
    document.getElementById('locationHint').textContent = t.locationHint;

    // Buttons
    randomColorBtn.textContent = `🎲 ${t.randomColorButton}`;
    document.querySelector('#pinForm button[type="submit"]').textContent = t.saveButton;
    deleteBtn.textContent = t.deleteButton;
    cancelBtn.textContent = t.cancelButton;
    copyBtn.textContent = t.copyButton;

    // Success message
    document.getElementById('successTitle').textContent = t.successTitle;
    document.getElementById('successMsg').textContent = t.successMessage;
    document.getElementById('successEditMsg').textContent = t.successEditMessage;

    // Admin
    document.getElementById('adminTitle').textContent = t.adminTitle;
    document.getElementById('adminPasswordLabel').textContent = t.adminPassword;
    document.getElementById('adminLoginBtn').textContent = t.adminLogin;
    adminLogoutBtn.textContent = t.adminLogout;

    // Update modal title if modal is open
    if (modal.style.display === 'block') {
        if (editTokenInput.value) {
            modalTitle.textContent = t.modalTitleEdit;
        } else {
            modalTitle.textContent = t.modalTitleAdd;
        }
    }
}

// Check for edit token in URL
const editToken = urlParams.get('edit');
if (editToken) {
    // Load pin for editing
    fetch(`/api/pins/${editToken}`)
        .then(response => {
            if (response.ok) {
                return response.json();
            }
        })
        .then(pin => {
            if (pin) {
                openModal(pin);
            }
        })
        .catch(error => {
            console.error('Error loading pin for editing:', error);
        });
}

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeModal();
    }
    if (e.target === adminModal) {
        closeAdminModal();
    }
});
