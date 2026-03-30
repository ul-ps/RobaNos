// Firebase configuration (v9-compat style for better local file support)
const firebaseConfig = {
  apiKey: "AIzaSyBOA17GuHTGQyNBF3bFmV0ajvSuwosAy4c",
  authDomain: "gamevault-6d411.firebaseapp.com",
  projectId: "gamevault-6d411",
  storageBucket: "gamevault-6d411.firebasestorage.app",
  messagingSenderId: "579653000796",
  appId: "1:579653000796:web:5a4241b579c5efc10ed099",
  measurementId: "G-GK0LL1Q36L"
};

// Initialize Firebase using global firebase object (from CDN)
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// Attach to window so other scripts can access it without modules
window.db = db;
window.firebase = firebase;
