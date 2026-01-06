import { db, auth } from "./firebase.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  registerServiceWorker, 
  startBackgroundTracking, 
  stopBackgroundTracking,
  syncOfflineLocations,
  requestAllPermissions
} from "./background-location.js";

var map;
var userMarker = null;
var accuracyCircle = null;
var userLat = null;
var userLon = null;
var userName = "";

// Check auth state
onAuthStateChanged(auth, function(user) {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  // Get user name from Firestore
  getDoc(doc(db, "users", user.uid)).then(function(userDoc) {
    if (userDoc.exists()) {
      var data = userDoc.data();
      userName = data.firstName + " " + data.lastName;
    } else {
      userName = user.email.split('@')[0];
    }
    localStorage.setItem('userName', userName);
    var userEmailEl = document.getElementById("userEmail");
    if (userEmailEl) userEmailEl.textContent = userName;
  }).catch(function() {
    userName = user.email.split('@')[0];
    localStorage.setItem('userName', userName);
    var userEmailEl = document.getElementById("userEmail");
    if (userEmailEl) userEmailEl.textContent = userName;
  });
  
  // Register service worker for background tracking
  registerServiceWorker();
  
  // Sync any offline locations
  syncOfflineLocations();
  
  // Initialize map
  initMap();
});

// Initialize map
function initMap() {
  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  // Request permissions and start tracking
  requestAllPermissions().then(function() {
    startTracking();
  });
}

// Start location tracking
function startTracking() {
  var locationCard = document.getElementById("locationCard");
  var coords = document.getElementById("coords");
  var statusText = document.getElementById("statusText");
  var trackingStatus = document.getElementById("trackingStatus");
  
  if (statusText) statusText.textContent = "Starting location tracking...";

  startBackgroundTracking(
    // Success callback
    function(lat, lon, accuracy) {
      userLat = lat;
      userLon = lon;

      updateMarker(lat, lon, accuracy);

      if (locationCard) locationCard.style.display = "block";
      if (coords) coords.textContent = lat.toFixed(6) + ", " + lon.toFixed(6);
      if (statusText) statusText.textContent = "Accuracy: " + Math.round(accuracy) + "m";
      if (trackingStatus) {
        trackingStatus.textContent = "● Live";
        trackingStatus.className = "tracking-status live";
      }
    },
    // Error callback
    function(error) {
      if (statusText) statusText.textContent = error;
      if (trackingStatus) {
        trackingStatus.textContent = "● Error";
        trackingStatus.className = "tracking-status offline";
      }
    }
  );
}

// Update marker on map
function updateMarker(lat, lon, accuracy) {
  var customIcon = L.divIcon({
    className: 'custom-marker',
    html: '<div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 15px rgba(99, 102, 241, 0.5);"></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  // Remove old marker and circle
  if (userMarker) map.removeLayer(userMarker);
  if (accuracyCircle) map.removeLayer(accuracyCircle);

  // Add accuracy circle
  if (accuracy) {
    accuracyCircle = L.circle([lat, lon], {
      radius: accuracy,
      color: '#6366f1',
      fillColor: '#6366f1',
      fillOpacity: 0.1,
      weight: 1
    }).addTo(map);
  }

  // Add marker
  userMarker = L.marker([lat, lon], { icon: customIcon }).addTo(map)
    .bindPopup('<b>📍 ' + userName + '</b><br>Accuracy: ' + Math.round(accuracy || 0) + 'm');

  // Center map on first location only
  if (!window.mapCentered) {
    map.setView([lat, lon], 16);
    window.mapCentered = true;
  }
}

// Recenter map
window.recenterMap = function() {
  if (userLat && userLon) {
    map.setView([userLat, userLon], 16);
    if (userMarker) userMarker.openPopup();
  }
};

// Logout
window.logout = function() {
  var user = auth.currentUser;
  if (user) {
    setDoc(doc(db, "locations", user.uid), {
      isOnline: false,
      lastSeen: new Date()
    }, { merge: true }).catch(function() {});
  }
  
  stopBackgroundTracking();
  
  signOut(auth).then(function() {
    window.location.href = "login.html";
  });
};

// Handle online/offline
window.addEventListener('online', function() {
  syncOfflineLocations();
  var trackingStatus = document.getElementById("trackingStatus");
  if (trackingStatus) {
    trackingStatus.textContent = "● Live";
    trackingStatus.className = "tracking-status live";
  }
});

window.addEventListener('offline', function() {
  var trackingStatus = document.getElementById("trackingStatus");
  if (trackingStatus) {
    trackingStatus.textContent = "● Offline";
    trackingStatus.className = "tracking-status offline";
  }
});

// Handle page visibility
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'visible') {
    syncOfflineLocations();
  }
});
