// Import Firebase (CDN style)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBgYhkoyEw9lEoPV_N6z0-1mLXFkX9fvsY",
  authDomain: "geoguard-22b30.firebaseapp.com",
  projectId: "geoguard-22b30",
  storageBucket: "geoguard-22b30.firebasestorage.app",
  messagingSenderId: "635217741348",
  appId: "1:635217741348:web:6a9ef394139ac06aa1fab1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const db = getFirestore(app);
