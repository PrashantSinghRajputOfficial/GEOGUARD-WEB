import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Show popup function
function showPopup(message, onOk) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  
  const popup = document.createElement("div");
  popup.className = "popup-box";
  popup.innerHTML = `
    <p>${message}</p>
    <button class="popup-btn" type="button">OK</button>
  `;
  
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
  
  popup.querySelector(".popup-btn").onclick = () => {
    overlay.remove();
    if (onOk) onOk();
  };
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
    msgEl.innerText = "Please use the signup page";
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
    msgEl.innerText = "Please enter your first and last name";
    return;
  }
  if (!phone) {
    msgEl.innerText = "Please enter your phone number";
    return;
  }
  if (!emailInput) {
    msgEl.innerText = "Please enter your email";
    return;
  }
  if (passwordInput.length < 6) {
    msgEl.innerText = "Password must be at least 6 characters";
    return;
  }
  if (passwordInput !== confirmPassword) {
    msgEl.innerText = "Passwords do not match";
    return;
  }

  try {
    msgEl.innerText = "Creating account...";
    const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
    
    // Save user data to Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      firstName: firstName,
      lastName: lastName,
      phone: phone,
      email: emailInput,
      createdAt: new Date().toISOString()
    });
    
    msgEl.innerText = "";
    showPopup("✅ Successfully Signed Up!", () => {
      window.location.href = "login.html";
    });
  } catch (err) {
    msgEl.innerText = err.message;
  }
};

// Admin email - only this email can access admin panel
const ADMIN_EMAIL = "prashantyashika@gmail.com";

// Login function
window.login = async function (e) {
  if (e) e.preventDefault();
  
  const emailEl = document.getElementById("email");
  const passwordEl = document.getElementById("password");
  const msgEl = document.getElementById("msg");

  const emailInput = emailEl.value.trim().toLowerCase();
  const passwordInput = passwordEl.value;

  // Clear previous message
  msgEl.innerText = "";

  if (!emailInput || !passwordInput) {
    msgEl.innerText = "Please enter email and password";
    return;
  }

  try {
    msgEl.innerText = "Signing in...";
    await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    
    msgEl.innerText = "";
    
    // Check if admin or regular user
    const isAdmin = emailInput === ADMIN_EMAIL;
    const redirectPage = isAdmin ? "admin.html" : "map.html";
    const successMessage = isAdmin ? "✅ Welcome Admin!" : "✅ Successfully Logged In!";
    
    showPopup(successMessage, () => {
      window.location.href = redirectPage;
    });
  } catch (err) {
    msgEl.innerText = err.message;
  }
};
