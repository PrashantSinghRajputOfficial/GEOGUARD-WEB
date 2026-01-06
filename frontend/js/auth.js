import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Admin emails - these emails can access admin panel
const ADMIN_EMAILS = ["prashantyashika@gmail.com"];

// Check if email is admin
function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

// Show message on screen
function showMessage(message, isSuccess) {
  const msgEl = document.getElementById("msg");
  if (msgEl) {
    msgEl.style.color = isSuccess ? "#22c55e" : "#f87171";
    msgEl.innerText = message;
  }
}

// Redirect function with fallback
function redirectTo(page) {
  // Try multiple redirect methods for cross-browser compatibility
  try {
    window.location.href = page;
  } catch (e) {
    try {
      window.location.assign(page);
    } catch (e2) {
      try {
        window.location.replace(page);
      } catch (e3) {
        document.location.href = page;
      }
    }
  }
}

// Signup function
window.signup = async function (e) {
  if (e) e.preventDefault();
  
  const firstNameEl = document.getElementById("firstName");
  const lastNameEl = document.getElementById("lastName");
  const phoneEl = document.getElementById("phone");
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const confirmPasswordEl = document.getElementById("confirmPassword");
  const msgEl = document.getElementById("msg");

  // Check if we're on signup page
  if (!firstNameEl || !confirmPasswordEl) {
    showMessage("Please use the signup page", false);
    return;
  }

  const firstName = firstNameEl.value.trim();
  const lastName = lastNameEl.value.trim();
  const phone = phoneEl.value.trim();
  const emailInput = emailEl.value.trim();
  const passwordInput = passwordEl.value;
  const confirmPassword = confirmPasswordEl.value;

  // Clear previous message
  msgEl.innerText = "";

  // Validation
  if (!firstName || !lastName) {
    showMessage("Please enter your first and last name", false);
    return;
  }
  if (!phone) {
    showMessage("Please enter your phone number", false);
    return;
  }
  if (!emailInput) {
    showMessage("Please enter your email", false);
    return;
  }
  if (passwordInput.length < 6) {
    showMessage("Password must be at least 6 characters", false);
    return;
  }
  if (passwordInput !== confirmPassword) {
    showMessage("Passwords do not match", false);
    return;
  }

  try {
    showMessage("Creating account...", true);
    const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
    
    // Save user data to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: emailInput,
      createdAt: new Date().toISOString()
    });
    
    showMessage("✅ Account created! Redirecting to login...", true);
    
    setTimeout(() => {
      redirectTo("login.html");
    }, 1500);
    
  } catch (err) {
    showMessage(err.message, false);
  }
};

// Login function
window.login = async function (e) {
  if (e) e.preventDefault();
  
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");

  const emailInput = emailEl.value.trim();
  const passwordInput = passwordEl.value;

  if (!emailInput || !passwordInput) {
    showMessage("Please enter email and password", false);
    return;
  }

  try {
    showMessage("Signing in...", true);
    const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    
    // Check if admin or regular user
    const userEmail = userCredential.user.email;
    const isAdmin = isAdminEmail(userEmail);
    
    const redirectPage = isAdmin ? "admin.html" : "map.html";
    const successMessage = isAdmin ? "✅ Welcome Admin! Redirecting..." : "✅ Login successful! Redirecting...";
    
    showMessage(successMessage, true);
    
    // Redirect after short delay
    setTimeout(() => {
      redirectTo(redirectPage);
    }, 1000);
    
  } catch (err) {
    showMessage(err.message, false);
  }
};
