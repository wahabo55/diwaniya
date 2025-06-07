// Firebase Configuration  
const firebaseConfig = {
  apiKey: "AIzaSyDSRYbkRiipw-BZkg-E6TJN82oHJ6wYK5w",
  authDomain: "diwaniya-88484.firebaseapp.com",
  databaseURL: "https://diwaniya-88484-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "diwaniya-88484",
  storageBucket: "diwaniya-88484.firebasestorage.app",
  messagingSenderId: "471748674904",
  appId: "1:471748674904:web:e782ec1fe7b2592360d12d"
};

// Initialize Firebase (v8 compat syntax)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Get Firebase services
const auth = firebase.auth();
const database = firebase.database();
// Storage removed - all media stored as base64 in database

// Export for use in other files
window.auth = auth;
window.database = database;

// Arabic language configuration for Firebase Auth
auth.languageCode = 'ar';

// Set up authentication state persistence
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

console.log('Firebase initialized successfully');
console.log('Auth available:', !!window.auth);
console.log('Database available:', !!window.database);

// Additional debug - test database access
setTimeout(() => {
    if (window.database) {
        console.log('Database ref test:', typeof window.database.ref);
    } else {
        console.error('Database still not available after timeout');
    }
}, 100);
