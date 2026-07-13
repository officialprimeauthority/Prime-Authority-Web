// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBm6V2_CR2GnD7hZC27VSJnL-zdbxAERkg",
  authDomain: "prime-authority.firebaseapp.com",
  databaseURL: "https://prime-authority-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "prime-authority",
  storageBucket: "prime-authority.firebasestorage.app",
  messagingSenderId: "394958687244",
  appId: "1:394958687244:web:629c04e964a7859f9c3229"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const database = getDatabase(app);
export const auth = getAuth(app);