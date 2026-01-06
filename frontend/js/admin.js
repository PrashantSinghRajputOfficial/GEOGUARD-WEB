import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Admin email
var ADMIN_EMAIL = "prashantyashika@gmail.com";

var map;
var markers = [];

// Check auth state and admin access
onAuthStateChanged(auth, function(user) {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  // Check if user is admin
  var userEmail = user.email.toLowerCase().trim();
  if (userEmail !== ADMIN_EMAIL) {
    alert("Access Denied! You are not authorized.");
    window.location.href = "map.html";
    return;
  }
  
  initMap();
  loadUsers();
});

// Initialize map
function initMap() {
  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
}

// Load all users
async function loadUsers() {
  var userList = document.getElementById("userList");
  var totalUsers = document.getElementById("totalUsers");
  var activeLocations = document.getElementById("activeLocations");
  var userCountBadge = document.getElementById("userCount");
  
  // Clear existing markers
  markers.forEach(function(m) { map.removeLayer(m); });
  markers = [];
  
  try {
    var snapshot = await getDocs(collection(db, "locations"));
    var count = 0;
    var onlineCount = 0;
    var html = "";

    snapshot.forEach(function(docSnap) {
      var data = docSnap.data();
      count++;
      
      var timestamp = data.timestamp && data.timestamp.seconds 
        ? new Date(data.timestamp.seconds * 1000) 
        : new Date(data.timestamp);
      
      var isRecent = (Date.now() - timestamp.getTime()) < 3600000;
      if (isRecent) onlineCount++;
      
      var displayName = data.name || (data.email ? data.email.split('@')[0] : 'Unknown');
      var lat = data.latitude;
      var lon = data.longitude;
      
      // Add marker with popup
      var customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background: ' + (isRecent ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #64748b, #475569)') + '; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      var popupContent = '<b>' + displayName + '</b><br>' +
        '<small>📍 ' + lat.toFixed(4) + ', ' + lon.toFixed(4) + '</small><br>' +
        '<small>🕐 ' + timestamp.toLocaleString() + '</small>' +
        '<div class="popup-actions">' +
        '<button class="btn btn-success btn-sm" onclick="navigateToUser(' + lat + ', ' + lon + ', \'' + displayName + '\')">🚗 Navigate</button>' +
        '</div>';

      var marker = L.marker([lat, lon], { icon: customIcon }).addTo(map)
        .bindPopup(popupContent);
      
      markers.push(marker);

      // Add to sidebar
      html += '<div class="user-card" onclick="focusUser(' + lat + ', ' + lon + ')">' +
        '<div class="user-card-header">' +
        '<div>' +
        '<div class="name">' + displayName + '</div>' +
        '<div class="time">🕐 ' + timestamp.toLocaleString() + '</div>' +
        '</div>' +
        '<span class="status ' + (isRecent ? 'online' : 'offline') + '">' + (isRecent ? '● Online' : '○ Offline') + '</span>' +
        '</div>' +
        '<div class="user-card-actions">' +
        '<button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); focusUser(' + lat + ', ' + lon + ')">📍 View</button>' +
        '<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); navigateToUser(' + lat + ', ' + lon + ', \'' + displayName + '\')">🚗 Navigate</button>' +
        '</div>' +
        '</div>';
    });

    userList.innerHTML = html || '<p style="color: #64748b; text-align: center; padding: 20px;">No users found</p>';
    if (totalUsers) totalUsers.textContent = count;
    if (activeLocations) activeLocations.textContent = onlineCount;
    if (userCountBadge) userCountBadge.textContent = count;

  } catch (err) {
    console.error("Error loading users:", err);
    userList.innerHTML = '<p style="color: #f87171; text-align: center;">Error loading users</p>';
  }
}

// Focus on user location
window.focusUser = function(lat, lon) {
  map.setView([lat, lon], 16);
  markers.forEach(function(marker) {
    var markerLatLng = marker.getLatLng();
    if (markerLatLng.lat === lat && markerLatLng.lng === lon) {
      marker.openPopup();
    }
  });
};


// Navigate to user - Open navigation modal
window.navigateToUser = function(lat, lon, name) {
  var modalHTML = '<div class="nav-modal" id="navModal" onclick="closeNavModal(event)">' +
    '<div class="nav-modal-content" onclick="event.stopPropagation()">' +
    '<h3>Navigate to ' + name + '</h3>' +
    '<p class="subtitle">Choose your preferred navigation app</p>' +
    '<div class="nav-options">' +
    '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lat + ',' + lon + '&travelmode=driving" target="_blank" class="nav-option" onclick="closeNavModal()">' +
    '<div class="nav-option-icon google">🗺️</div>' +
    '<div class="nav-option-text"><div class="title">Google Maps</div><div class="desc">Open in Google Maps</div></div>' +
    '</a>' +
    '<a href="https://maps.apple.com/?daddr=' + lat + ',' + lon + '&dirflg=d" target="_blank" class="nav-option" onclick="closeNavModal()">' +
    '<div class="nav-option-icon apple">🍎</div>' +
    '<div class="nav-option-text"><div class="title">Apple Maps</div><div class="desc">Open in Apple Maps</div></div>' +
    '</a>' +
    '<a href="https://waze.com/ul?ll=' + lat + ',' + lon + '&navigate=yes" target="_blank" class="nav-option" onclick="closeNavModal()">' +
    '<div class="nav-option-icon waze">🚙</div>' +
    '<div class="nav-option-text"><div class="title">Waze</div><div class="desc">Open in Waze</div></div>' +
    '</a>' +
    '</div>' +
    '<button class="btn close-btn" onclick="closeNavModal()">Cancel</button>' +
    '</div>' +
    '</div>';
  
  var existingModal = document.getElementById('navModal');
  if (existingModal) existingModal.remove();
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// Close navigation modal
window.closeNavModal = function(event) {
  if (event && event.target.id !== 'navModal') return;
  var modal = document.getElementById('navModal');
  if (modal) modal.remove();
};

// Refresh data
window.refreshData = function() {
  loadUsers();
};

// Toggle sidebar on mobile
window.toggleSidebar = function() {
  var sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('expanded');
};

// Logout function
window.logout = async function() {
  await signOut(auth);
  window.location.href = "login.html";
};

// Initialize sidebar toggle on mobile
document.addEventListener('DOMContentLoaded', function() {
  var sidebarHandle = document.querySelector('.sidebar-handle');
  if (sidebarHandle) {
    sidebarHandle.addEventListener('click', toggleSidebar);
  }
  
  var touchStartY = 0;
  var sidebar = document.querySelector('.sidebar');
  
  if (sidebar) {
    sidebar.addEventListener('touchstart', function(e) {
      touchStartY = e.touches[0].clientY;
    });
    
    sidebar.addEventListener('touchmove', function(e) {
      var touchY = e.touches[0].clientY;
      var diff = touchStartY - touchY;
      
      if (diff > 50) {
        sidebar.classList.add('expanded');
      } else if (diff < -50) {
        sidebar.classList.remove('expanded');
      }
    });
  }
});
