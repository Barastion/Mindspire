import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, onValue, remove } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

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
console.log("Pomyślnie zainicjalizowano Firebase");

// Funkcja do pobierania IP użytkownika
async function getUserIP() {
  console.groupCollapsed("Pobieranie IP");
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('Pobrano IP:', data.ip);
    console.groupEnd();
    return data.ip;
  } catch (error) {
    console.error('Błąd pobierania IP:', error.message);
    console.groupEnd();
    return 'Nieznane IP';
  }
}

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie przez Google");
  try {
    console.log('Rozpoczynanie procesu logowania przez Google');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userIP = await getUserIP();
    console.log('Zalogowano przez Google:', user, 'IP:', userIP);

    // Sprawdź, czy użytkownik ma wybrany customUsername
    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    const userData = {
      email: user.email,
      lastLogin: new Date().toISOString(),
      lastIp: userIP
    };
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      console.log('Użytkownik nie ma wybranego username, wyświetl modal');
      showUsernameModal(user, userData);
    } else {
      console.log('Użytkownik ma już username, aktualizuj dane');
      userData.customUsername = userSnapshot.val().customUsername;
      await set(userRef, userData);
    }
  } catch (error) {
    console.error('Błąd logowania:', error.code, error.message);
    console.groupEnd();
    alert('Błąd logowania: ' + error.message);
    return;
  }
  console.groupEnd();
  console.log("Pomyślnie zalogowano");
}

// Funkcja do wyświetlania modala wyboru username
function showUsernameModal(user, userData) {
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
    console.groupCollapsed("Zapis username");
    const username = input.value.trim();

    // Walidacja username
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

    // Sprawdź unikalność username
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
      console.error('Błąd sprawdzania unikalności username:', error.message);
      error.textContent = 'Błąd połączenia z bazą danych. Spróbuj ponownie.';
      error.style.display = 'block';
      console.groupEnd();
      return;
    }

    // Zapisz dane użytkownika
    try {
      console.log('Zapis username dla użytkownika:', user.uid);
      userData.customUsername = username;
      await set(ref(db, 'users/' + user.uid), userData);
      console.log('Zapisano dane użytkownika:', userData);
      await set(ref(db, 'usernames/' + user.uid), { username: username });
      console.log('Zapisano username w /usernames');
    } catch (error) {
      console.error('Błąd zapisywania username:', error.message);
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
      console.log('Pomyślnie wylogowano');
      console.groupEnd();
    })
    .catch((error) => {
      console.error('Błąd wylogowania:', error.code, error.message);
      console.groupEnd();
      alert('Błąd wylogowania: ' + error.message);
    });
}

// Funkcja do aktualizacji logów
async function updateLogs() {
  console.groupCollapsed("Aktualizacja logów");
  const logsRef = ref(db, 'logs');
  onValue(logsRef, async (snapshot) => {
    const logsData = snapshot.val();
    let logs = logsData ? Object.entries(logsData).map(([key, value]) => ({ key, ...value })) : [];
    logs.sort((a, b) => b.timestamp - a.timestamp);

    if (logs.length > 100) {
      const logsToDelete = logs.slice(100);
      logs = logs.slice(0, 100);
      logsToDelete.forEach(log => remove(ref(db, `logs/${log.key}`)));
      console.log('Usunięto starsze logi, pozostawiono 100 najnowszych');
    }

    // Pobierz dane użytkowników, aby sprawdzić lastIp
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef);
    const usersData = usersSnapshot.val() || {};
    const ipToUsername = {};
    Object.entries(usersData).forEach(([uid, data]) => {
      if (data.lastIp && data.customUsername) {
        ipToUsername[data.lastIp] = data.customUsername;
      }
    });
    console.log('Mapa IP do username:', ipToUsername);

    displayLogs(logs, ipToUsername);
    console.groupEnd();
  });
}

// Funkcja do wyświetlania logów z przewijaniem
function displayLogs(logs, ipToUsername) {
  console.groupCollapsed("Wyświetlanie logów");
  const logTableBody = document.getElementById('logTableBody');
  if (!logTableBody) {
    console.error('Nie znaleziono elementu logTableBody');
    console.groupEnd();
    return;
  }

  logTableBody.innerHTML = '';

  if (logs.length === 0) {
    logTableBody.innerHTML = '<tr><td colspan="6">Brak logów.</td></tr>';
    console.log('Brak logów do wyświetlenia');
    console.groupEnd();
    return;
  }

  const visibleLogs = logs.slice(0, 10); // Pokazuj tylko 10 najnowszych logów
  visibleLogs.forEach(log => {
    const row = document.createElement('tr');
    const ipDisplay = ipToUsername[log.ip] ? `${log.ip}<br>(${ipToUsername[log.ip]})` : log.ip;
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
  console.log('Wyświetlono logi:', visibleLogs.length);
  console.groupEnd();
}

// Inicjalizacja
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
  updateLogs();
});

let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  if (!user && wasLoggedIn) {
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});
