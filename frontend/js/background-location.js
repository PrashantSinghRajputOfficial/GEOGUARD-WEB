// Background Location Service for GeoGuard
import { db, auth } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

var watchId = null;
var isTracking = false;

// Register Service Worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(function(registration) {
      console.log('Service Worker registered');
      
      // Request notification permission for background updates
      if ('Notification' in window) {
        Notification.requestPermission();
      }
      
      // Register background sync
      if ('sync' in registration) {
        registration.sync.register('sync-location').catch(function(err) {
          console.log('Background sync not supported');
        });
      }
      
    }).catch(function(err) {
      console.log('Service Worker registration failed:', err);
    });
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', function(event) {
      if (event.data.type === 'SYNC_LOCATION') {
        updateLocationOnce();
      }
    });
  }
}

// Start watching location continuously
export function startBackgroundTracking(onUpdate, onError) {
  if (!navigator.geolocation) {
    if (onError) onError('Geolocation not supported');
    return;
  }
  
  // Stop existing tracking
  stopBackgroundTracking();
  
  var options = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0
  };
  
  // Watch position
  watchId = navigator.geolocation.watchPosition(
    function(position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;
      var accuracy = position.coords.accuracy;
      
      isTracking = true;
      
      if (onUpdate) onUpdate(lat, lon, accuracy);
      
      // Save to Firebase
      saveLocationToFirebase(lat, lon, accuracy);
      
      // Store locally for offline
      saveLocationLocally(lat, lon, accuracy);
    },
    function(error) {
      var message = 'Location error';
      if (error.code === 1) message = 'Location permission denied';
      if (error.code === 2) message = 'Location unavailable';
      if (error.code === 3) message = 'Location timeout';
      
      if (onError) onError(message);
    },
    options
  );
  
  return watchId;
}

// Stop tracking
export function stopBackgroundTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    isTracking = false;
  }
}

// Save location to Firebase
function saveLocationToFirebase(lat, lon, accuracy) {
  var user = auth.currentUser;
  if (!user) return;
  
  var userName = localStorage.getItem('userName') || user.email.split('@')[0];
  
  setDoc(doc(db, "locations", user.uid), {
    email: user.email,
    name: userName,
    latitude: lat,
    longitude: lon,
    accuracy: accuracy || 0,
    timestamp: new Date(),
    isOnline: true
  }).catch(function(err) {
    console.log('Error saving to Firebase, storing locally');
    saveLocationLocally(lat, lon, accuracy);
  });
}

// Save location locally for offline sync
function saveLocationLocally(lat, lon, accuracy) {
  var location = {
    lat: lat,
    lon: lon,
    accuracy: accuracy,
    timestamp: Date.now()
  };
  localStorage.setItem('lastLocation', JSON.stringify(location));
  
  // Add to pending queue
  var pending = JSON.parse(localStorage.getItem('pendingLocations') || '[]');
  pending.push(location);
  // Keep only last 10
  if (pending.length > 10) pending = pending.slice(-10);
  localStorage.setItem('pendingLocations', JSON.stringify(pending));
}

// Sync offline locations when back online
export function syncOfflineLocations() {
  var pending = JSON.parse(localStorage.getItem('pendingLocations') || '[]');
  if (pending.length === 0) return;
  
  var user = auth.currentUser;
  if (!user) return;
  
  // Upload latest location
  var latest = pending[pending.length - 1];
  saveLocationToFirebase(latest.lat, latest.lon, latest.accuracy);
  
  // Clear pending
  localStorage.removeItem('pendingLocations');
}

// Update location once (for background sync)
function updateLocationOnce() {
  if (!navigator.geolocation) return;
  
  navigator.geolocation.getCurrentPosition(
    function(position) {
      saveLocationToFirebase(
        position.coords.latitude,
        position.coords.longitude,
        position.coords.accuracy
      );
    },
    function() {},
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

// Check if tracking is active
export function isTrackingActive() {
  return isTracking;
}

// Request all permissions
export function requestAllPermissions() {
  return new Promise(function(resolve) {
    var permissions = [];
    
    // Location permission
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function() { permissions.push('location'); resolve(permissions); },
        function() { resolve(permissions); }
      );
    }
    
    // Notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(function(result) {
        if (result === 'granted') permissions.push('notification');
      });
    }
  });
}
