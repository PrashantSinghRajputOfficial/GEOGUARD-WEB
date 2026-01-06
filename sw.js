// Service Worker for GeoGuard - Background Location Tracking

const CACHE_NAME = 'geoguard-v1';
const urlsToCache = [
  '/frontend/pages/login.html',
  '/frontend/pages/signup.html',
  '/frontend/pages/map.html',
  '/frontend/css/auth.css',
  '/frontend/css/map.css',
  '/frontend/js/auth.js',
  '/frontend/js/map.js',
  '/frontend/js/firebase.js',
  '/frontend/js/gps.js'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Background Sync for location updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'location-sync') {
    event.waitUntil(syncLocation());
  }
});

// Periodic Background Sync (for supported browsers)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'location-update') {
    event.waitUntil(syncLocation());
  }
});

async function syncLocation() {
  // This will be called when sync is triggered
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_LOCATION' });
  });
}

// Listen for messages from main app
self.addEventListener('message', (event) => {
  if (event.data.type === 'LOCATION_UPDATE') {
    // Store location for background sync
    saveLocationToIndexedDB(event.data.location);
  }
});

// IndexedDB for offline location storage
function saveLocationToIndexedDB(location) {
  const request = indexedDB.open('GeoGuardDB', 1);
  
  request.onupgradeneeded = (event) => {
    const db = event.target.result;
    if (!db.objectStoreNames.contains('pendingLocations')) {
      db.createObjectStore('pendingLocations', { keyPath: 'id', autoIncrement: true });
    }
  };
  
  request.onsuccess = (event) => {
    const db = event.target.result;
    const tx = db.transaction('pendingLocations', 'readwrite');
    const store = tx.objectStore('pendingLocations');
    store.add(location);
  };
}
