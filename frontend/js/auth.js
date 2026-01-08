import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Admin email
var ADMIN_EMAIL = "prashantyashika@gmail.com";

// Check if user is already logged in (auto-redirect)
onAuthStateChanged(auth, function(user) {
  // Only run on login/signup pages
  var currentPage = window.location.pathname;
  var isAuthPage = currentPage.includes('login') || currentPage.includes('signup');
  
  if (user && isAuthPage) {
    // User is already logged in, redirect based on role
    var userEmail = user.email.toLowerCase().trim();
    
    if (userEmail === ADMIN_EMAIL) {
      window.location.href = "admin.html";
    } else {
      window.location.href = "map.html";
    }
  }
});

// Signup function
window.signup = async function() {
  var firstName = document.getElementById("firstName").value.trim();
  var lastName = document.getElementById("lastName").value.trim();
  var phone = document.getElementById("phone").value.trim();
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value;
  var confirmPassword = document.getElementById("confirmPassword").value;
  var msg = document.getElementById("msg");

  // Validation
  if (!firstName || !lastName) {
    msg.style.color = "#f87171";
    msg.innerText = "Please enter your first and last name";
    return;
  }
  if (!phone) {
    msg.style.color = "#f87171";
    msg.innerText = "Please enter your phone number";
    return;
  }
  if (!email) {
    msg.style.color = "#f87171";
    msg.innerText = "Please enter your email";
    return;
  }
  if (password.length < 6) {
    msg.style.color = "#f87171";
    msg.innerText = "Password must be at least 6 characters";
    return;
  }
  if (password !== confirmPassword) {
    msg.style.color = "#f87171";
    msg.innerText = "Passwords do not match";
    return;
  }

  try {
    msg.style.color = "#22c55e";
    msg.innerText = "Creating account...";
    
    var userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: email,
      createdAt: new Date().toISOString()
    });
    
    msg.innerText = "✅ Account created! Redirecting...";
    
    setTimeout(function() {
      window.location.href = "login.html";
    }, 1500);
    
  } catch (err) {
    msg.style.color = "#f87171";
    msg.innerText = err.message;
  }
};

// Login function
window.login = async function() {
  var email = document.getElementById("email").value.trim();
  var password = document.getElementById("password").value;
  var msg = document.getElementById("msg");

  if (!email || !password) {
    msg.style.color = "#f87171";
    msg.innerText = "Please enter email and password";
    return;
  }

  try {
    msg.style.color = "#22c55e";
    msg.innerText = "Signing in...";
    
    var userCredential = await signInWithEmailAndPassword(auth, email, password);
    var userEmail = userCredential.user.email.toLowerCase().trim();
    
    // Request location permission before redirecting
    msg.innerText = "Requesting permissions...";
    
    requestLocationPermission(function() {
      // Check if admin
      if (userEmail === ADMIN_EMAIL) {
        msg.innerText = "✅ Welcome Admin! Redirecting...";
        setTimeout(function() {
          window.location.href = "admin.html";
        }, 1000);
      } else {
        msg.innerText = "✅ Login successful! Redirecting...";
        setTimeout(function() {
          window.location.href = "map.html";
        }, 1000);
      }
    });
    
  } catch (err) {
    msg.style.color = "#f87171";
    msg.innerText = err.message;
  }
};

// Request location permission
function requestLocationPermission(callback) {
  if (!navigator.geolocation) {
    callback();
    return;
  }
  
  navigator.geolocation.getCurrentPosition(
    function() {
      console.log("Location permission granted");
      callback();
    },
    function() {
      console.log("Location permission denied or error");
      callback();
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}
