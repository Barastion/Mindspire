// Sprawdzenie, czy Firebase jest dostępny globalnie
console.log('Firebase available:', typeof firebase !== 'undefined');
console.log('Firebase app available:', typeof firebase.initializeApp !== 'undefined');
console.log('Firebase auth available:', typeof firebase.auth !== 'undefined');
console.log('Firebase database available:', typeof firebase.database !== 'undefined');

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
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const auth = firebase.auth(app);
const db = firebase.database(app);

console.log('Firebase app initialized:', app);
console.log('Auth initialized:', auth);
console.log('Database initialized:', db);

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    // Zapis danych użytkownika do bazy danych
    await db.ref('users/' + user.uid).set({
      username: user.displayName,
      email: user.email,
      lastLogin: new Date().toISOString()
    });
    alert('Zalogowano pomyślnie! Dane zapisano w bazie.');
  } catch (error) {
    console.error('Błąd logowania:', error.message);
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
  loginPanel.style.border = '2px solid red'; // Dodane dla debugowania
  loginPanel.innerHTML = `
    <h3>Logowanie</h3>
    <button id="googleSignInButton">Zaloguj przez Google</button>
    <button id="closePanelButton">Zamknij</button>
  `;
  document.body.appendChild(loginPanel);
  console.log('Login panel appended to body');

  // Obsługa przycisku logowania przez Google
  document.getElementById('googleSignInButton').addEventListener('click', () => {
    console.log('Google sign-in button clicked');
    signInWithGoogle();
    document.body.removeChild(loginPanel);
  });

  // Obsługa przycisku zamykania panelu
  document.getElementById('closePanelButton').addEventListener('click', () => {
    console.log('Close panel button clicked');
    document.body.removeChild(loginPanel);
  });
}

// Funkcja do aktualizacji sekcji logowania
function updateLoginSection(user) {
  console.log('updateLoginSection called with user:', user);
  const loginDiv = document.querySelector('.login');
  if (user) {
    loginDiv.innerHTML = `Witaj, ${user.displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
    const authLink = document.getElementById('authLink');
    authLink.addEventListener('click', () => {
      console.log('Logout link clicked');
      auth.signOut().then(() => {
        console.log('Wylogowano pomyślnie');
      }).catch((error) => {
        console.error('Błąd wylogowania:', error);
      });
    });
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    const authLink = document.getElementById('authLink');
    authLink.addEventListener('click', () => {
      console.log('Auth link clicked');
      showLoginPanel();
    });
  }
}

// Obsługa stanu zalogowania
auth.onAuthStateChanged((user) => {
  console.log('Auth state changed:', user);
  updateLoginSection(user);
});

// Inicjalizacja: ustawienie początkowego stanu
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded');
  updateLoginSection(auth.currentUser);
});
