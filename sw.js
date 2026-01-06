// GeoGuard Service Worker
var CACHE_NAME = 'geoguard-v1';
var urlsToCache = [
  './frontend/pages/login.html',
  './frontend/pages/signup.html',
  './frontend/pages/map.html',
  './frontend/pages/admin.html',
  './frontend/css/auth.css',
  './frontend/css/map.css',
  './frontend/js/auth.js',
  './frontend/js/map.js',
  './frontend/js/admin.js',
  './frontend/js/firebase.js',
  './frontend/js/gps.js'
];

// Install
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - Network first, then cache
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request).catch(function() {
      return caches.match(event.request);
    })
  );
});

// Background Sync for location
self.addEventListener('sync', function(event) {
  if (event.tag === 'sync-location') {
    event.waitUntil(syncLocation());
  }
});

function syncLocation() {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage({ type: 'SYNC_LOCATION' });
    });
  });
}

// Push notification for location updates
self.addEventListener('push', function(event) {
  var options = {
    body: 'GeoGuard is tracking your location',
    icon: './frontend/assets/icon-192.png',
    badge: './frontend/assets/icon-192.png',
    silent: true
  };
  event.waitUntil(
    self.registration.showNotification('GeoGuard', options)
  );
});
