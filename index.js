import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, push, limitToLast } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

// Inicjalizacja Firebase z grupowaniem logów
console.groupCollapsed("Inicjalizacja Firebase");
console.log('Firebase app module available:', typeof initializeApp === 'function');
console.log('Firebase auth module available:', typeof getAuth === 'function');
console.log('Firebase database available:', typeof getDatabase === 'function');

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

console.log('Firebase app initialized:', app);
console.log('Auth initialized:', auth);
console.log('Database initialized:', db);
console.groupEnd();
console.log("Pomyślnie zalogowano do Firebase");

// Funkcja do pobierania IP
async function getIp() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch {
    return 'Nieznane IP';
  }
}

// Funkcja do pobierania lokalizacji
async function getLocation(ip) {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();
    return {
      city: data.city || 'Nieznane miasto',
      country: data.country_name || 'Nieznany kraj',
      isp: data.org || 'Nieznany dostawca'
    };
  } catch {
    return { city: 'Nieznane', country: 'Nieznany', isp: 'Nieznany' };
  }
}

// Funkcja do określania typu urządzenia
function getDeviceType() {
  const ua = navigator.userAgent;
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet/i.test(ua)) return 'Tablet';
  if (/windows/i.test(ua)) return 'PC';
  if (/mac/i.test(ua)) return 'Mac';
  return 'Nieznane';
}

// Funkcja zapisu logów z unikaniem duplikatów
async function saveLog() {
  console.groupCollapsed("Zapis logu");
  try {
    const ip = await getIp();
    const location = await getLocation(ip);
    const now = new Date();
    const timestamp = now.getTime();

    // Sprawdzenie duplikatów z tego samego IP
    const logsRef = ref(db, 'logs');
    const recentLogsQuery = query(logsRef, orderByChild('ip'), equalTo(ip), limitToLast(1));
    const recentLogsSnapshot = await get(recentLogsQuery);
    const recentLogs = recentLogsSnapshot.val();

    if (recentLogs) {
      const lastLog = Object.values(recentLogs)[0];
      const timeDiff = (timestamp - lastLog.timestamp) / 1000 / 60; // w minutach
      if (timeDiff < 10) {
        console.log('Log z tego IP był już zapisany w ciągu ostatnich 10 minut. Pomijanie.');
        console.groupEnd();
        return;
      }
    }

    // Zapis nowego logu
    const logData = {
      date: now.toLocaleDateString('pl-PL'),
      day: now.toLocaleDateString('pl-PL', { weekday: 'long' }),
      time: now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }),
      ip: ip,
      location: {
        city: location.city,
        country: location.country
      },
      device: getDeviceType(),
      isp: location.isp,
      timestamp: timestamp
    };

    const newLogRef = push(logsRef);
    await set(newLogRef, logData);
    console.log('Log zapisany:', logData);
  } catch (error) {
    console.error('Błąd zapisu logu:', error.message);
  }
  console.groupEnd();
}

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie");
  try {
    console.log('Starting Google sign-in process');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      console.log('Użytkownik nie ma wybranego username, wyświetl modal');
      showUsernameModal(user);
    } else {
      console.log('Użytkownik ma już username, aktualizuj lastLogin');
      await set(ref(db, 'users/' + user.uid + '/lastLogin'), new Date().toISOString());
    }
  } catch (error) {
    console.error('Błąd logowania:', error.code, error.message);
    console.groupEnd();
    console.log("Niepomyślnie zalogowano");
    alert('Błąd logowania: ' + error.message);
    return;
  }
  console.groupEnd();
  console.log("Pomyślnie zalogowano");
}

// Funkcja do wyświetlania modala wyboru username
function showUsernameModal(user) {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('usernameInput');
  const error = document.getElementById('usernameError');
  const submitButton = document.querySelector('.submit-username-btn');

  if (!modal || !input || !error || !submitButton) {
    console.error('Nie znaleziono elementów modala:', { modal, input, error, submitButton });
    alert('Błąd: Nie można wyświetlić modala wyboru username.');
    return;
  }

  modal.style.display = 'block';
  input.value = '';
  error.style.display = 'none';

  const newSubmitButton = submitButton.cloneNode(true);
  submitButton.parentNode.replaceChild(newSubmitButton, submitButton);

  newSubmitButton.addEventListener('click', async () => {
    console.groupCollapsed("Logowanie");
    console.log('Kliknięto przycisk Zatwierdź');
    const username = input.value.trim();

    if (username.length < 3) {
      console.log('Błąd walidacji: Username za krótki');
      error.textContent = 'Username musi mieć co najmniej 3 znaki.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      console.log('Błąd walidacji: Niedozwolone znaki w username');
      error.textContent = 'Username może zawierać tylko litery, cyfry i podkreślniki.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    try {
      console.log('Sprawdzanie unikalności username:', username);
      const usernamesRef = ref(db, 'usernames');
      const queryRef = query(usernamesRef, orderByChild('username'), equalTo(username));
      const snapshot = await get(queryRef);
      if (snapshot.exists()) {
        console.log('Username już zajęty:', username);
        error.textContent = 'Ten username jest już zajęty.';
        error.style.display = 'block';
        console.groupEnd();
        return;
      }
      console.log('Username dostępny:', username);
    } catch (error) {
      console.error('Błąd podczas sprawdzania unikalności username:', error.message);
      error.textContent = 'Błąd połączenia z bazą danych. Spróbuj ponownie.';
      if (error.message.includes('Index not defined')) {
        error.textContent = 'Błąd konfiguracji bazy danych. Skontaktuj się z administratorem.';
      }
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    try {
      console.log('Zapis username dla użytkownika:', user.uid);
      const userRef = ref(db, 'users/' + user.uid);
      const userData = {
        customUsername: username,
        email: user.email,
        lastLogin: new Date().toISOString()
      };
      await set(userRef, userData);
      await set(ref(db, 'usernames/' + user.uid), { username: username });
      console.log('Zapisano dane użytkownika:', userData);
    } catch (error) {
      console.error('Błąd podczas zapisywania username:', error.message);
      error.textContent = 'Błąd zapisu do bazy danych. Spróbuj ponownie.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    console.groupEnd();
    modal.style.display = 'none';
    alert('Zalogowano pomyślnie! Username został zapisany.');
  });
}

// Funkcja do wyświetlania panelu logowania
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

// Funkcja do aktualizacji sekcji logowania
function updateLoginSection(user) {
  const loginDiv = document.querySelector('.login');
  if (!loginDiv) return;

  if (user) {
    const userRef = ref(db, 'users/' + user.uid);
    get(userRef).then((snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        const displayName = userData.customUsername || 'Użytkownik';
        loginDiv.innerHTML = `Witaj, ${displayName} | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
      } else {
        loginDiv.innerHTML = `Witaj, Użytkownik | <span id="authLink" style="cursor: pointer;">Wyloguj</span>`;
      }
      const authLink = document.getElementById('authLink');
      authLink.replaceWith(authLink.cloneNode(true));
      const newAuthLink = document.getElementById('authLink');
      newAuthLink.addEventListener('click', handleLogout);
    }).catch((error) => {
      console.error('Błąd pobierania danych użytkownika:', error);
    });
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="authLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    const authLink = document.getElementById('authLink');
    authLink.replaceWith(authLink.cloneNode(true));
    const newAuthLink = document.getElementById('authLink');
    newAuthLink.addEventListener('click', showLoginPanel);
  }
}

// Funkcja do wylogowania
function handleLogout() {
  console.groupCollapsed("Wylogowanie");
  signOut(auth)
    .then(() => {
      console.log('signOut promise resolved');
      console.groupEnd();
      console.log("Pomyślnie wylogowano");
    })
    .catch((error) => {
      console.error('Błąd wylogowania:', error.code, error.message);
      console.groupEnd();
      console.log("Niepomyślnie wylogowano");
      alert('Błąd wylogowania: ' + error.message);
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

// Inicjalizacja i zapis logu przy wejściu
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
  saveLog();
});
