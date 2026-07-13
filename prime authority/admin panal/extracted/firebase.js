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

// Initialize Firebase (will be done after SDK loads)
let app, database, auth;
let firebaseReadyPromise = null;

// Load Firebase SDK dynamically
async function initializeFirebase() {
  if (firebaseReadyPromise) return firebaseReadyPromise;

  firebaseReadyPromise = (async () => {
    // Import Firebase modules
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js");
    const { getDatabase, ref, onValue, update, remove, push, set } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js");
    const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js");

    // Initialize
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    auth = getAuth(app);

    // Make functions global
    window.ref = ref;
    window.onValue = onValue;
    window.update = update;
    window.remove = remove;
    window.push = push;
    window.set = set;
    window.signInWithEmailAndPassword = signInWithEmailAndPassword;
    window.signOut = signOut;
    window.onAuthStateChanged = onAuthStateChanged;
    window.database = database;
    window.auth = auth;
  })();

  return firebaseReadyPromise;
}

window.initializeFirebase = initializeFirebase;
window.firebaseReady = initializeFirebase();

// Helper functions
async function ensureFirebaseReady() {
  await initializeFirebase();
  if (!auth) throw new Error('Firebase auth is not ready.');
}

async function getCurrentUser() {
  await ensureFirebaseReady();

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    }, reject);
  });
}

window.ensureFirebaseReady = ensureFirebaseReady;
window.getCurrentUser = getCurrentUser;