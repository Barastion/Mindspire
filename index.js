import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, push, limitToLast } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

// Inicjalizacja Firebase
console.groupCollapsed("Inicjalizacja Firebase");
const firebaseConfig = {
  apiKey: "AIzaSyCeJVS7qR3lOYusK32jqdxwMrEkJ0yU8P0",
  authDomain: "mindspire-2b5b4.firebaseapp.com",
  databaseURL: "https://mindspire-2b5b4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mindspire-2b5b4",
  storageBucket: "mindspire-2b5b4.appspot.com",
  messagingSenderId: "796533772592",
  appId: "1:796533772592:web:44e3e6a34b84c7f663b8f5",
  measurementId: "G-HFZ8T97V5Y"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getDatabase(app);
console.log('Firebase initialized successfully');
console.groupEnd();

// Funkcja logowania przez Google
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie przez Google");
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano:', user.email);

    // Pobierz IP użytkownika (tu symulacja - w rzeczywistości potrzebujesz API)
    const ip = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => 'Nieznane IP');

    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      console.log('Brak username - wyświetl modal');
      showUsernameModal(user, ip);
    } else {
      console.log('Aktualizacja lastLogin i lastIp');
      await set(ref(db, 'users/' + user.uid), {
        customUsername: userSnapshot.val().customUsername,
        email: user.email,
        lastLogin: new Date().toISOString(),
        lastIp: ip
      });
    }
  } catch (error) {
    console.error('Błąd logowania:', error.message);
    alert('Błąd logowania: ' + error.message);
  }
  console.groupEnd();
}

// Funkcja wyświetlania modala wyboru username
function showUsernameModal(user, ip) {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('usernameInput');
  const error = document.getElementById('usernameError');
  const submitButton = document.querySelector('.submit-username-btn');

  modal.style.display = 'block';
  input.value = '';
  error.style.display = 'none';

  const newSubmitButton = submitButton.cloneNode(true);
  submitButton.parentNode.replaceChild(newSubmitButton, submitButton);

  newSubmitButton.addEventListener('click', async () => {
    console.groupCollapsed("Wybór username");
    const username = input.value.trim();

    if (username.length < 3 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      error.textContent = 'Username musi mieć min. 3 znaki i zawierać tylko litery, cyfry, _';
      error.style.display = 'block';
      console.log('Nieprawidłowy username');
      console.groupEnd();
      return;
    }

    const usernamesRef = ref(db, 'usernames');
    const queryRef = query(usernamesRef, orderByChild('username'), equalTo(username));
    const snapshot = await get(queryRef);
    if (snapshot.exists()) {
      error.textContent = 'Username już zajęty';
      error.style.display = 'block';
      console.log('Username zajęty');
      console.groupEnd();
      return;
    }

    try {
      const userData = {
        customUsername: username,
        email: user.email,
        lastLogin: new Date().toISOString(),
        lastIp: ip
      };
      await set(ref(db, 'users/' + user.uid), userData);
      await set(ref(db, 'usernames/' + user.uid), { username: username });
      console.log('Username zapisany:', username);
      modal.style.display = 'none';
      alert('Zalogowano pomyślnie!');
    } catch (error) {
      error.textContent = 'Błąd zapisu: ' + error.message;
      error.style.display = 'block';
      console.error('Błąd zapisu:', error.message);
    }
    console.groupEnd();
  });
}

// Funkcja zapisu logów przy wejściu na stronę
async function saveLog() {
  console.groupCollapsed("Zapis logu");
  try {
    const ip = await fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => data.ip)
      .catch(() => 'Nieznane IP');
    const locationData = await fetch(`https://ipapi.co/${ip}/json/`)
      .then(res => res.json())
      .catch(() => ({ city: 'Nieznane', country: 'Nieznany' }));

    const now = new Date();
    const logData = {
      date: now.toLocaleDateString('pl-PL'),
      day: now.toLocaleDateString('pl-PL', { weekday: 'long' }),
      time: now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      ip: ip,
      location: {
        city: locationData.city || 'Nieznane miasto',
        country: locationData.country_name || 'Nieznany kraj'
      },
      device: navigator.userAgent.split('(')[1].split(')')[0] || 'Nieznane',
      isp: locationData.org || 'Nieznany dostawca',
      timestamp: now.getTime()
    };

    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef);
    await set(newLogRef, logData);
    console.log('Log zapisany:', logData);

    // Aktualizacja lastIp dla zalogowanego użytkownika
    const user = auth.currentUser;
    if (user) {
      await set(ref(db, 'users/' + user.uid + '/lastIp'), ip);
      console.log('Zaktualizowano lastIp dla użytkownika:', user.uid);
    }

    // Ograniczenie do 100 logów
    const logsSnapshot = await get(query(logsRef, orderByChild('timestamp'), limitToLast(101)));
    const logs = logsSnapshot.val() ? Object.entries(logsSnapshot.val()) : [];
    if (logs.length > 100) {
      const oldestLog = logs.sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      await set(ref(db, 'logs/' + oldestLog[0]), null);
      console.log('Usunięto najstarszy log');
    }
  } catch (error) {
    console.error('Błąd zapisu logu:', error.message);
  }
  console.groupEnd();
}

// Funkcja wyświetlania logów
async function displayLogs() {
  console.groupCollapsed("Wyświetlanie logów");
  try {
    const logsRef = ref(db, 'logs');
    const recentLogsQuery = query(logsRef, orderByChild('timestamp'), limitToLast(100));
    const logsSnapshot = await get(recentLogsQuery);
    let logs = logsSnapshot.val() ? Object.values(logsSnapshot.val()) : [];
    logs.sort((a, b) => b.timestamp - a.timestamp);

    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    const ipToUsername = {};
    const users = usersSnapshot.val() || {};
    for (const user of Object.values(users)) {
      if (user.lastIp && user.customUsername) {
        ipToUsername[user.lastIp] = user.customUsername;
      }
    }

    const logTableBody = document.getElementById('logTableBody');
    logTableBody.innerHTML = logs.length === 0 ? '<tr><td colspan="6">Brak logów</td></tr>' : '';

    logs.slice(0, 10).forEach(log => {
      const username = ipToUsername[log.ip] ? `(${ipToUsername[log.ip]})` : '';
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.date || 'Brak'}</td>
        <td>${log.day || 'Brak'}</td>
        <td>${log.time || 'Brak'}</td>
        <td>${log.ip || 'Brak'}<br>${username}</td>
        <td>${log.location.city || 'Nieznane miasto'}<br>(${log.location.country || 'Nieznany kraj'})</td>
        <td>${log.device || 'Brak'}<br>(${log.isp || 'Nieznany dostawca'})</td>
      `;
      logTableBody.appendChild(row);
    });
    console.log('Tabela logów wyświetlona');
  } catch (error) {
    console.error('Błąd wyświetlania logów:', error.message);
  }
  console.groupEnd();
}

// Funkcje logowania/wylogowania i panelu
function showLoginPanel() {
  if (document.getElementById('loginPanel')) return;
  const loginPanel = document.createElement('div');
  loginPanel.id = 'loginPanel';
  loginPanel.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #2D2D2D; padding: 20px; border-radius: 10px; z-index: 1001; color: #FFFFFF; border: 2px solid red;';
  loginPanel.innerHTML = '<h3>Logowanie</h3><button id="googleSignInButton">Zaloguj przez Google</button><button id="closePanelButton">Zamknij</button>';
  document.body.appendChild(loginPanel);

  document.getElementById('googleSignInButton').addEventListener('click', () => {
    signInWithGoogle();
    document.body.removeChild(loginPanel);
  });
  document.getElementById('closePanelButton').addEventListener('click', () => document.body.removeChild(loginPanel));
}

function updateLoginSection(user) {
  const loginDiv = document.querySelector('.login');
  if (!loginDiv) return;

  if (user) {
    get(ref(db, 'users/' + user.uid)).then(snapshot => {
      const displayName = snapshot.exists() ? snapshot.val().customUsername || 'Użytkownik' : 'Użytkownik';
      loginDiv.innerHTML = `Witaj, ${displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
      const authLink = document.getElementById('authLink');
      authLink.replaceWith(authLink.cloneNode(true));
      document.getElementById('authLink').addEventListener('click', handleLogout);
    });
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    const authLink = document.getElementById('authLink');
    authLink.replaceWith(authLink.cloneNode(true));
    document.getElementById('authLink').addEventListener('click', showLoginPanel);
  }
}

function handleLogout() {
  console.groupCollapsed("Wylogowanie");
  signOut(auth)
    .then(() => console.log('Wylogowano'))
    .catch(error => {
      console.error('Błąd wylogowania:', error.message);
      alert('Błąd wylogowania: ' + error.message);
    });
  console.groupEnd();
}

let wasLoggedIn = false;
onAuthStateChanged(auth, user => {
  if (!user && wasLoggedIn) alert('Wylogowano pomyślnie!');
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Inicjalizacja i zapis logu przy wejściu
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
  saveLog();
});

// Ładowanie sekcji z wywołaniem displayLogs
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', async e => {
    e.preventDefault();
    const section = item.getAttribute('data-section');
    await loadSection(section);
    if (section === 'spolecznosc') await displayLogs();
  });
});

async function loadSection(section) {
  const contentWrapper = document.getElementById('content-wrapper');
  try {
    let contentHtml = section === 'strona-glowna' ? contentWrapper.innerHTML : await (await fetch(`${section}.html`)).text();
    contentWrapper.innerHTML = contentHtml;

    const existingStyles = document.querySelector('link[data-section-style]');
    if (existingStyles) existingStyles.remove();
    if (section !== 'strona-glowna') {
      const styleLink = document.createElement('link');
      styleLink.rel = 'stylesheet';
      styleLink.href = `${section}.css`;
      styleLink.setAttribute('data-section-style', section);
      document.head.appendChild(styleLink);
    }

    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`.nav-item[data-section="${section}"]`).classList.add('active');
  } catch (error) {
    console.error('Błąd ładowania sekcji:', error);
    contentWrapper.innerHTML = '<div class="content"><h2>Błąd</h2><p>Nie udało się załadować sekcji.</p></div>';
  }
}
