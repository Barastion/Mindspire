import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getDatabase, ref, set } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-database.js';

// Sprawdzenie, czy moduły Firebase są dostępne
console.log('Firebase app module available:', typeof initializeApp === 'function');
console.log('Firebase auth module available:', typeof getAuth === 'function');
console.log('Firebase database available:', typeof getDatabase === 'function');

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
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

console.log('Firebase app initialized:', app);
console.log('Auth initialized:', auth);
console.log('Database initialized:', db);

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  try {
    console.log('Starting Google sign-in process');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    // Przygotowanie danych do zapisu
    const userData = {
      username: user.displayName,
      email: user.email,
      lastLogin: new Date().toISOString()
    };
    const userRef = ref(db, 'users/' + user.uid);
    console.log('Attempting to write user data to:', userRef.toString(), 'with data:', userData);

    // Zapis danych użytkownika do bazy danych
    await set(userRef, userData);
    console.log('Dane użytkownika zapisano pomyślnie');
    alert('Zalogowano pomyślnie! Dane zapisano w bazie.');
  } catch (error) {
    console.error('Błąd logowania:', error.code, error.message);
    alert('Błąd logowania: ' + error.message);
  }
}

// Funkcja do wyświetlania panelu logowania
function showLoginPanel() {
  console.log('showLoginPanel called');
  if (document.getElementById('loginPanel')) {
    console.log('Login panel already exists');
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
  console.log('Login panel appended to body');

  document.getElementById('googleSignInButton').addEventListener('click', () => {
    console.log('Google sign-in button clicked');
    signInWithGoogle();
    document.body.removeChild(loginPanel);
  });

  document.getElementById('closePanelButton').addEventListener('click', () => {
    console.log('Close panel button clicked');
    document.body.removeChild(loginPanel);
  });
}

// Funkcja do aktualizacji sekcji logowania
function updateLoginSection(user) {
  console.log('updateLoginSection called with user:', user);
  const loginDiv = document.querySelector('.login');
  if (!loginDiv) {
    console.error('Login div not found');
    return;
  }

  if (user) {
    loginDiv.innerHTML = `Witaj, ${user.displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
    const authLink = document.getElementById('authLink');
    if (authLink) {
      // Usuwamy wszystkie istniejące listenery
      authLink.replaceWith(authLink.cloneNode(true));
      const newAuthLink = document.getElementById('authLink');
      newAuthLink.addEventListener('click', () => {
        console.log('Logout link clicked');
        signOut(auth).then(() => {
          console.log('signOut promise resolved');
        }).catch((error) => {
          console.error('Błąd wylogowania:', error.code, error.message);
          alert('Błąd wylogowania: ' + error.message);
        });
      });
      console.log('Logout link listener added');
    } else {
      console.error('authLink not found after setting loginDiv innerHTML');
    }
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    const authLink = document.getElementById('authLink');
    if (authLink) {
      authLink.replaceWith(authLink.cloneNode(true));
      const newAuthLink = document.getElementById('authLink');
      newAuthLink.addEventListener('click', () => {
        console.log('Auth link clicked');
        showLoginPanel();
      });
      console.log('Login link listener added');
    }
  }
}

// Obsługa stanu zalogowania z komunikatem wylogowania
let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  console.log('Auth state changed:', user);
  if (!user && wasLoggedIn) {
    console.log('User logged out, showing alert');
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Inicjalizacja: ustawienie początkowego stanu
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  updateLoginSection(auth.currentUser);
});
