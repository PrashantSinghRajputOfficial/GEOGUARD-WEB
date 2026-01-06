import { db, auth } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Admin emails - these emails can access admin panel
const ADMIN_EMAILS = ["prashantyashika@gmail.com"];

// Check if email is admin
function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

let map;
let markers = [];
let adminLat = null;
let adminLon = null;

// Check auth state and admin access
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  
  console.log("Admin page - User email:", user.email); // Debug log
  
  // Check if user is admin
  if (!isAdminEmail(user.email)) {
    alert("⛔ Access Denied! You are not authorized to view this page.");
    window.location.href = "map.html";
    return;
  }
  
  console.log("Admin access granted!"); // Debug log
  initMap();
  loadUsers();
  getAdminLocation();
});

// Get admin's current location
function getAdminLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        adminLat = pos.coords.latitude;
        adminLon = pos.coords.longitude;
      },
      (err) => console.log("Admin location not available")
    );
  }
}

// Initialize map
function initMap() {
  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
}

// Load all users
async function loadUsers() {
  const userList = document.getElementById("userList");
  const totalUsers = document.getElementById("totalUsers");
  const activeLocations = document.getElementById("activeLocations");
  const userCountBadge = document.getElementById("userCount");
  
  // Clear existing markers
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  
  try {
    const snapshot = await getDocs(collection(db, "locations"));
    let count = 0;
    let onlineCount = 0;
    let html = "";

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      count++;
      
      const timestamp = data.timestamp?.seconds 
        ? new Date(data.timestamp.seconds * 1000) 
        : new Date(data.timestamp);
      
      const isRecent = (Date.now() - timestamp.getTime()) < 3600000;
      if (isRecent) onlineCount++;
      
      const displayName = data.name || data.email?.split('@')[0] || 'Unknown';
      const lat = data.latitude;
      const lon = data.longitude;
      
      // Add marker with popup
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${isRecent ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #64748b, #475569)'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      const popupContent = `
        <b>${displayName}</b><br>
        <small>📍 ${lat.toFixed(4)}, ${lon.toFixed(4)}</small><br>
        <small>🕐 ${timestamp.toLocaleString()}</small>
        <div class="popup-actions">
          <button class="btn btn-success btn-sm" onclick="navigateToUser(${lat}, ${lon}, '${displayName}')">
            🚗 Navigate
          </button>
        </div>
      `;

      const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map)
        .bindPopup(popupContent);
      
      markers.push(marker);

      // Add to sidebar
      html += `
        <div class="user-card" onclick="focusUser(${lat}, ${lon})">
          <div class="user-card-header">
            <div>
              <div class="name">${displayName}</div>
              <div class="time">🕐 ${timestamp.toLocaleString()}</div>
            </div>
            <span class="status ${isRecent ? 'online' : 'offline'}">${isRecent ? '● Online' : '○ Offline'}</span>
          </div>
          <div class="user-card-actions">
            <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); focusUser(${lat}, ${lon})">
              📍 View
            </button>
            <button class="btn btn-success btn-sm" onclick="event.stopPropagation(); navigateToUser(${lat}, ${lon}, '${displayName}')">
              🚗 Navigate
            </button>
          </div>
        </div>
      `;
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
  // Find and open the marker popup
  markers.forEach(marker => {
    const markerLatLng = marker.getLatLng();
    if (markerLatLng.lat === lat && markerLatLng.lng === lon) {
      marker.openPopup();
    }
  });
};


// Navigate to user - Open navigation modal
window.navigateToUser = function(lat, lon, name) {
  // Create modal HTML
  const modalHTML = `
    <div class="nav-modal" id="navModal" onclick="closeNavModal(event)">
      <div class="nav-modal-content" onclick="event.stopPropagation()">
        <h3>Navigate to ${name}</h3>
        <p class="subtitle">Choose your preferred navigation app</p>
        
        <div class="nav-options">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=driving" 
             target="_blank" class="nav-option" onclick="closeNavModal()">
            <div class="nav-option-icon google">🗺️</div>
            <div class="nav-option-text">
              <div class="title">Google Maps</div>
              <div class="desc">Open in Google Maps</div>
            </div>
          </a>
          
          <a href="https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d" 
             target="_blank" class="nav-option" onclick="closeNavModal()">
            <div class="nav-option-icon apple">🍎</div>
            <div class="nav-option-text">
              <div class="title">Apple Maps</div>
              <div class="desc">Open in Apple Maps</div>
            </div>
          </a>
          
          <a href="https://waze.com/ul?ll=${lat},${lon}&navigate=yes" 
             target="_blank" class="nav-option" onclick="closeNavModal()">
            <div class="nav-option-icon waze">🚙</div>
            <div class="nav-option-text">
              <div class="title">Waze</div>
              <div class="desc">Open in Waze</div>
            </div>
          </a>
        </div>
        
        <button class="btn close-btn" onclick="closeNavModal()">Cancel</button>
      </div>
    </div>
  `;
  
  // Remove existing modal if any
  const existingModal = document.getElementById('navModal');
  if (existingModal) existingModal.remove();
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
};

// Close navigation modal
window.closeNavModal = function(event) {
  if (event && event.target.id !== 'navModal') return;
  const modal = document.getElementById('navModal');
  if (modal) modal.remove();
};

// Refresh data
window.refreshData = function() {
  loadUsers();
};

// Toggle sidebar on mobile
window.toggleSidebar = function() {
  const sidebar = document.querySelector('.sidebar');
  sidebar.classList.toggle('expanded');
};

// Logout function
window.logout = async function() {
  await signOut(auth);
  window.location.href = "login.html";
};

// Initialize sidebar toggle on mobile
document.addEventListener('DOMContentLoaded', () => {
  const sidebarHandle = document.querySelector('.sidebar-handle');
  if (sidebarHandle) {
    sidebarHandle.addEventListener('click', toggleSidebar);
  }
  
  // Swipe to expand sidebar
  let touchStartY = 0;
  const sidebar = document.querySelector('.sidebar');
  
  if (sidebar) {
    sidebar.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
    });
    
    sidebar.addEventListener('touchmove', (e) => {
      const touchY = e.touches[0].clientY;
      const diff = touchStartY - touchY;
      
      if (diff > 50) {
        sidebar.classList.add('expanded');
      } else if (diff < -50) {
        sidebar.classList.remove('expanded');
      }
    });
  }
});
