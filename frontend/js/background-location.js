// Background Location Service for GeoGuard
import { db, auth } from "./firebase.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let watchId = null;
let isTracking = false;

// Initialize background location tracking
export async function initBackgroundLocation() {
  // Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Request persistent storage
      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        console.log('Persistent storage:', isPersisted);
      }
      
      // Register for periodic background sync (if supported)
      if ('periodicSync' in registration) {
        try {
          await registration.periodicSync.register('location-update', {
            minInterval: 15 * 60 * 1000 // 15 minutes minimum
          });
          console.log('Periodic sync registered');
        } catch (err) {
          console.log('Periodic sync not available:', err);
        }
      }
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SYNC_LOCATION') {
          updateLocationNow();
        }
      });
      
    } catch (err) {
      console.error('Service Worker registration failed:', err);
    }
  }
}

// Start continuous location tracking
export function startLocationTracking(onUpdate, onError) {
  if (!navigator.geolocation) {
    if (onError) onError('Geolocation not supported');
    return;
  }
  
  // Stop any existing tracking
  stopLocationTracking();
  
  const options = {
    enableHighAccuracy: true,
    timeout: 30000,
    maximumAge: 0
  };
  
  // Watch position continuously
  watchId = navigator.geolocation.watchPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const accuracy = position.coords.accuracy;
      
      isTracking = true;
      
      // Callback to update UI
      if (onUpdate) onUpdate(lat, lon, accuracy);
      
      // Save to Firebase
      await saveLocation(lat, lon, accuracy);
      
      // Send to service worker for background sync
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'LOCATION_UPDATE',
          location: { lat, lon, accuracy, timestamp: Date.now() }
        });
      }
    },
    (error) => {
      console.error('Location error:', error);
      if (onError) onError(error.message);
    },
    options
  );
  
  console.log('Location tracking started, watchId:', watchId);
  return watchId;
}

// Stop location tracking
export function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    isTracking = false;
    console.log('Location tracking stopped');
  }
}

// Save location to Firebase
async function saveLocation(lat, lon, accuracy) {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    await setDoc(doc(db, "locations", user.uid), {
      email: user.email,
      name: user.displayName || user.email.split('@')[0],
      latitude: lat,
      longitude: lon,
      accuracy: accuracy,
      timestamp: new Date(),
      isOnline: true
    }, { merge: true });
  } catch (err) {
    console.error('Error saving location:', err);
    // Store locally for later sync
    storeOfflineLocation(lat, lon, accuracy);
  }
}

// Store location offline when no internet
function storeOfflineLocation(lat, lon, accuracy) {
  const pendingLocations = JSON.parse(localStorage.getItem('pendingLocations') || '[]');
  pendingLocations.push({
    lat, lon, accuracy,
    timestamp: Date.now()
  });
  localStorage.setItem('pendingLocations', JSON.stringify(pendingLocations));
}

// Sync offline locations when back online
export async function syncOfflineLocations() {
  const pendingLocations = JSON.parse(localStorage.getItem('pendingLocations') || '[]');
  
  if (pendingLocations.length === 0) return;
  
  const user = auth.currentUser;
  if (!user) return;
  
  // Upload the latest location
  const latest = pendingLocations[pendingLocations.length - 1];
  await saveLocation(latest.lat, latest.lon, latest.accuracy);
  
  // Clear pending
  localStorage.removeItem('pendingLocations');
  console.log('Offline locations synced');
}

// Update location immediately
async function updateLocationNow() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await saveLocation(
          position.coords.latitude,
          position.coords.longitude,
          position.coords.accuracy
        );
        resolve();
      },
      reject,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Check if tracking is active
export function isTrackingActive() {
  return isTracking;
}

// Request background location permission (for Android)
export async function requestBackgroundPermission() {
  if ('permissions' in navigator) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      console.log('Geolocation permission:', result.state);
      return result.state === 'granted';
    } catch (err) {
      console.log('Permission query not supported');
    }
  }
  return false;
}
