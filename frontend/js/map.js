import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  initBackgroundLocation, 
  startLocationTracking, 
  stopLocationTracking,
  syncOfflineLocations,
  requestBackgroundPermission 
} from "./background-location.js";

let map;
let userMarker = null;
let userLat = null;
let userLon = null;
let userName = "";
let accuracyCircle = null;

// Check auth state
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  // Get user name from Firestore
  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (userDoc.exists()) {
      const data = userDoc.data();
      userName = `${data.firstName} ${data.lastName}`;
    } else {
      userName = user.email.split('@')[0];
    }
    document.getElementById("userEmail").textContent = userName;
  } catch (err) {
    userName = user.email.split('@')[0];
    document.getElementById("userEmail").textContent = userName;
  }
  
  // Initialize background location service
  await initBackgroundLocation();
  
  // Sync any offline locations
  await syncOfflineLocations();
  
  // Initialize map
  initMap();
});

// Initialize map
function initMap() {
  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // Start continuous location tracking
  startTracking();
}

// Start location tracking
function startTracking() {
  const locationCard = document.getElementById("locationCard");
  const coords = document.getElementById("coords");
  const statusText = document.getElementById("statusText");
  const trackingStatus = document.getElementById("trackingStatus");
  
  if (statusText) statusText.textContent = "Starting location tracking...";

  startLocationTracking(
    // Success callback - called on every location update
    async (lat, lon, accuracy) => {
      const user = auth.currentUser;
      if (!user) return;

      userLat = lat;
      userLon = lon;

      // Update marker
      updateMarker(lat, lon, accuracy);

      // Update UI
      if (locationCard) locationCard.style.display = "block";
      if (coords) coords.textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
      if (statusText) statusText.textContent = `Accuracy: ${accuracy.toFixed(0)}m`;
      if (trackingStatus) {
        trackingStatus.textContent = "● Live";
        trackingStatus.className = "tracking-status live";
      }

      // Save to Firestore with user name
      try {
        await setDoc(doc(db, "locations", user.uid), {
          email: user.email,
          name: userName || user.email.split('@')[0],
          latitude: lat,
          longitude: lon,
          accuracy: accuracy,
          timestamp: new Date(),
          isOnline: true
        });
      } catch (err) {
        console.error("Error saving location:", err);
      }
    },
    // Error callback
    (error) => {
      if (statusText) statusText.textContent = error;
      if (trackingStatus) {
        trackingStatus.textContent = "● Offline";
        trackingStatus.className = "tracking-status offline";
      }
    }
  );
}

// Update marker on map
function updateMarker(lat, lon, accuracy) {
  // Custom marker icon
  const customIcon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: linear-gradient(135deg, #6366f1, #8b5cf6); 
      width: 24px; 
      height: 24px; 
      border-radius: 50%; 
      border: 3px solid white; 
      box-shadow: 0 2px 15px rgba(99, 102, 241, 0.5);
      animation: pulse 2s infinite;
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Remove old marker and circle
  if (userMarker) map.removeLayer(userMarker);
  if (accuracyCircle) map.removeLayer(accuracyCircle);

  // Add accuracy circle
  accuracyCircle = L.circle([lat, lon], {
    radius: accuracy,
    color: '#6366f1',
    fillColor: '#6366f1',
    fillOpacity: 0.1,
    weight: 1
  }).addTo(map);

  // Add marker
  userMarker = L.marker([lat, lon], { icon: customIcon }).addTo(map)
    .bindPopup(`<b>📍 ${userName}</b><br>Accuracy: ${accuracy.toFixed(0)}m`);

  // Center map on first location
  if (!window.mapCentered) {
    map.setView([lat, lon], 16);
    window.mapCentered = true;
  }
}

// Recenter to user location
window.recenterMap = function() {
  if (userLat && userLon) {
    map.setView([userLat, userLon], 16);
    if (userMarker) userMarker.openPopup();
  }
};

// Logout function
window.logout = async function() {
  // Mark user as offline
  const user = auth.currentUser;
  if (user) {
    try {
      await setDoc(doc(db, "locations", user.uid), {
        isOnline: false,
        lastSeen: new Date()
      }, { merge: true });
    } catch (err) {}
  }
  
  stopLocationTracking();
  await signOut(auth);
  window.location.href = "login.html";
};

// Handle page visibility change
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Page is visible, sync offline locations
    syncOfflineLocations();
  }
});

// Handle online/offline events
window.addEventListener('online', () => {
  syncOfflineLocations();
  const trackingStatus = document.getElementById("trackingStatus");
  if (trackingStatus) {
    trackingStatus.textContent = "● Live";
    trackingStatus.className = "tracking-status live";
  }
});

window.addEventListener('offline', () => {
  const trackingStatus = document.getElementById("trackingStatus");
  if (trackingStatus) {
    trackingStatus.textContent = "● Offline";
    trackingStatus.className = "tracking-status offline";
  }
});
