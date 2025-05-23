import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

// Konfiguracja Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCeJVS7qR3lOYusK32jqdxwMrEkJ0yU8P0",
  authDomain: "mindspire-2b5b4.firebaseapp.com",
  databaseURL: "https://mindspire-2b5b4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mindspire-2b5b4",
  storageBucket: "mindspire-2b5b4.firebasestorage.app",
  messagingSenderId: "796533772592",
  appId: "1:796533772592:web:44e3e6a34b84c7f663b8f5",
  measurementId: "G-HFZ8T97V5Y"
};

// Inicjalizacja Firebase
try {
  const app = initializeApp(firebaseConfig);
  const analytics = getAnalytics(app);
  const auth = getAuth(app);
  const db = getDatabase(app);
  console.groupCollapsed('Firebase initialization details');
  console.log('Firebase app module available:', typeof initializeApp === 'function');
  console.log('Firebase auth module available:', typeof getAuth === 'function');
  console.log('Firebase database available:', typeof getDatabase === 'function');
  console.log('Firebase app initialized:', app);
  console.log('Auth initialized:', auth);
  console.log('Database initialized:', db);
  console.groupEnd();
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
}

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userData = {
      username: user.displayName,
      email: user.email,
      lastLogin: new Date().toISOString()
    };
    const userRef = ref(db, 'users/' + user.uid);
    await set(userRef, userData);
    console.groupCollapsed('Login details');
    console.log('User:', user);
    console.log('Writing data to:', userRef.toString(), 'with data:', userData);
    console.groupEnd();
    console.log('User logged in successfully');
    alert('Zalogowano pomyślnie! Dane zapisano w bazie.');
  } catch (error) {
    console.error('Login failed:', error.code, error.message);
    alert('Błąd logowania: ' + error.message);
  }
}

// Funkcja do wyświetlania panelu logowania
function showLoginPanel() {
  if (document.getElementById('loginPanel')) {
    return;
  }
  const loginPanel = document.createElement('div');
  loginPanel.id = 'loginPanel';
  loginPanel.style.position = 'fixed';
  loginPanel.style.top = '50%';
  loginPanel.style.left = '50%';
  loginPanel.style.transform = 'translate(-50%, -50%)';
  loginPanel.style.backgroundColor = '#2D2D2D';
  loginPanel.style.padding = '20px';
  loginPanel.style.borderRadius = '10px';
  loginPanel.style.zIndex = '1001';
  loginPanel.style.color = '#FFFFFF';
  loginPanel.style.border = '2px solid red';
  loginPanel.innerHTML = `
    <h3>Logowanie</h3>
    <button id="googleSignInButton">Zaloguj przez Google</button>
    <button id="closePanelButton">Zamknij</button>
  `;
  document.body.appendChild(loginPanel);
  document.getElementById('googleSignInButton').addEventListener('click', () => {
    signInWithGoogle();
    document.body.removeChild(loginPanel);
  });
  document.getElementById('closePanelButton').addEventListener('click', () => {
    document.body.removeChild(loginPanel);
  });
}

// Funkcja do aktualizacji sekcji logowania
function updateLoginSection(user) {
  const loginDiv = document.querySelector('.login');
  if (!loginDiv) {
    console.error('Login div not found');
    return;
  }
  if (user) {
    loginDiv.innerHTML = `Witaj, ${user.displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
    const authLink = document.getElementById('authLink');
    if (authLink) {
      authLink.replaceWith(authLink.cloneNode(true));
      const newAuthLink = document.getElementById('authLink');
      newAuthLink.addEventListener('click', () => {
        signOut(auth).catch((error) => {
          console.error('Logout failed:', error.code, error.message);
          alert('Błąd wylogowania: ' + error.message);
        });
      });
    }
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    const authLink = document.getElementById('authLink');
    if (authLink) {
      authLink.replaceWith(authLink.cloneNode(true));
      const newAuthLink = document.getElementById('authLink');
      newAuthLink.addEventListener('click', () => {
        showLoginPanel();
      });
    }
  }
}

// Obsługa stanu zalogowania
let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  if (!user && wasLoggedIn) {
    console.groupCollapsed('Logout details');
    console.log('Auth state changed:', user);
    console.groupEnd();
    console.log('User logged out successfully');
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Inicjalizacja: ustawienie początkowego stanu
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
});
