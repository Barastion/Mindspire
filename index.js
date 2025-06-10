import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, limitToLast } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

// Inicjalizacja Firebase
console.groupCollapsed("Inicjalizacja Firebase");
console.log('Firebase app module available:', typeof initializeApp === 'function');
console.log('Firebase auth module available:', typeof getAuth === 'function');
console.log('Firebase database available:', typeof getDatabase === 'function');

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

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);

console.log('Firebase app initialized:', app);
console.log('Auth initialized:', auth);
console.log('Database initialized:', db);
console.groupEnd();

// Placeholder dla pobierania IP użytkownika (do zaimplementowania na serwerze)
async function getUserIp() {
  console.groupCollapsed("Pobieranie IP");
  console.log('Pobieranie IP użytkownika – placeholder');
  console.groupEnd();
  return "192.168.1.1"; // Przykład, zastąp rzeczywistą logiką
}

// Logowanie przez Google
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie");
  try {
    console.log('Rozpoczynanie procesu logowania przez Google');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    const ip = await getUserIp();
    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      console.log('Brak username, wyświetlanie modala');
      showUsernameModal(user, ip);
    } else {
      console.log('Aktualizacja danych użytkownika z lastIp');
      await set(ref(db, 'users/' + user.uid), {
        ...userSnapshot.val(),
        lastLogin: new Date().toISOString(),
        lastIp: ip
      });
    }
  } catch (error) {
    console.error('Błąd logowania:', error.code, error.message);
    console.groupEnd();
    alert('Błąd logowania: ' + error.message);
    return;
  }
  console.groupEnd();
}

// Modal wyboru username
function showUsernameModal(user, ip) {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('usernameInput');
  const error = document.getElementById('usernameError');
  const submitButton = document.querySelector('.submit-username-btn');

  if (!modal || !input || !error || !submitButton) {
    console.error('Brak elementów modala:', { modal, input, error, submitButton });
    alert('Błąd: Nie można wyświetlić modala.');
    return;
  }

  modal.style.display = 'block';
  input.value = '';
  error.style.display = 'none';

  const newSubmitButton = submitButton.cloneNode(true);
  submitButton.parentNode.replaceChild(newSubmitButton, submitButton);

  newSubmitButton.addEventListener('click', async () => {
    console.groupCollapsed("Zatwierdzenie username");
    const username = input.value.trim();

    if (username.length < 3) {
      error.textContent = 'Username musi mieć co najmniej 3 znaki.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      error.textContent = 'Username może zawierać tylko litery, cyfry i podkreślniki.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    try {
      const usernamesRef = ref(db, 'usernames');
      const queryRef = query(usernamesRef, orderByChild('username'), equalTo(username));
      const snapshot = await get(queryRef);
      if (snapshot.exists()) {
        error.textContent = 'Ten username jest już zajęty.';
        error.style.display = 'block';
        console.groupEnd();
        return;
      }
    } catch (error) {
      error.textContent = 'Błąd połączenia z bazą danych.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    try {
      const userRef = ref(db, 'users/' + user.uid);
      const userData = {
        customUsername: username,
        email: user.email,
        lastLogin: new Date().toISOString(),
        lastIp: ip
      };
      await set(userRef, userData);
      await set(ref(db, 'usernames/' + user.uid), { username: username });
      console.log('Zapisano dane użytkownika:', userData);
    } catch (error) {
      error.textContent = 'Błąd zapisu do bazy danych.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    console.groupEnd();
    modal.style.display = 'none';
    alert('Zalogowano pomyślnie! Username zapisany.');
  });
}

// Aktualizacja sekcji logowania
function updateLoginSection(user) {
  const loginDiv = document.querySelector('.login');
  if (!loginDiv) return;

  if (user) {
    const userRef = ref(db, 'users/' + user.uid);
    get(userRef).then((snapshot) => {
      const userData = snapshot.val() || {};
      const displayName = userData.customUsername || 'Użytkownik';
      loginDiv.innerHTML = `Witaj, ${displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
      document.getElementById('authLink').addEventListener('click', handleLogout);
    });
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    document.getElementById('authLink').addEventListener('click', showLoginPanel);
  }
}

// Wylogowanie
function handleLogout() {
  console.groupCollapsed("Wylogowanie");
  signOut(auth)
    .then(() => {
      console.log('Wylogowano pomyślnie');
      console.groupEnd();
    })
    .catch((error) => {
      console.error('Błąd wylogowania:', error.code, error.message);
      console.groupEnd();
      alert('Błąd wylogowania: ' + error.message);
    });
}

// Panel logowania
function showLoginPanel() {
  if (document.getElementById('loginPanel')) return;

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

// Obsługa stanu zalogowania
let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  if (!user && wasLoggedIn) {
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Aktualizacja logów
async function updateLogs() {
  console.groupCollapsed("Aktualizacja logów");
  const logsRef = ref(db, 'logs');
  const recentLogsQuery = query(logsRef, orderByChild('timestamp'), limitToLast(100));
  const snapshot = await get(recentLogsQuery);
  const logsData = snapshot.val();
  let logs = logsData ? Object.values(logsData) : [];
  logs.sort((a, b) => b.timestamp - a.timestamp);
  console.log('Pobrano logi:', logs.length);

  const usersRef = ref(db, 'users');
  const usersSnapshot = await get(usersRef);
  const users = usersSnapshot.val() || {};
  console.log('Pobrano użytkowników:', Object.keys(users).length);

  displayLogs(logs.slice(0, 10), users);
  console.groupEnd();
}

// Wyświetlanie logów
function displayLogs(logs, users) {
  const logTableBody = document.getElementById('logTableBody');
  if (!logTableBody) return;

  logTableBody.innerHTML = '';

  if (logs.length === 0) {
    logTableBody.innerHTML = '<tr><td colspan="6">Brak logów.</td></tr>';
    return;
  }

  logs.forEach(log => {
    let ipDisplay = log.ip || 'Brak';
    for (const [_, user] of Object.entries(users)) {
      if (user.lastIp === log.ip) {
        ipDisplay += `<br>(${user.customUsername})`;
        break;
      }
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${log.date || 'Brak'}</td>
      <td>${log.day || 'Brak'}</td>
      <td>${log.time || 'Brak'}</td>
      <td>${ipDisplay}</td>
      <td>${log.location.city || 'Nieznane miasto'}<br>(${log.location.country || 'Nieznany kraj'})</td>
      <td>${log.device || 'Brak'}<br>(${log.isp || 'Nieznany dostawca'})</td>
    `;
    logTableBody.appendChild(row);
  });
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      if (section === 'spolecznosc') {
        updateLogs();
      }
    });
  });
});
