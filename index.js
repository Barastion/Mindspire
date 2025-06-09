import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, push, remove } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

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
console.log("Pomyślnie zalogowano do Firebase");

// Funkcja do logowania przez Google z zapisem lastIp
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie");
  try {
    console.log('Starting Google sign-in process');
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    // Pobierz IP użytkownika
    const ip = await getIp();

    // Sprawdź, czy użytkownik ma już wybrany customUsername
    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      console.log('Użytkownik nie ma wybranego username, wyświetl modal');
      showUsernameModal(user);
    } else {
      console.log('Użytkownik ma już username, aktualizuj lastLogin i lastIp');
      await set(ref(db, 'users/' + user.uid + '/lastLogin'), new Date().toISOString());
      await set(ref(db, 'users/' + user.uid + '/lastIp'), ip);
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

// Funkcja do wyświetlania modala wyboru username z zapisem lastIp
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
        lastLogin: new Date().toISOString(),
        lastIp: await getIp() // Zapis lastIp
      };
      await set(userRef, userData);
      console.log('Zapisano dane użytkownika:', userData);

      await set(ref(db, 'usernames/' + user.uid), { username: username });
      console.log('Zapisano username w /usernames');
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

// Funkcja do wylogowania z grupowaniem logów
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

// Funkcje logowania odwiedzin
let isLoggingVisit = false;

async function logVisit() {
  if (isLoggingVisit) {
    console.log('Logowanie w toku, pomijam.');
    return;
  }
  if (sessionStorage.getItem('visitLogged')) {
    console.log('Log już zapisany w tej sesji, pomijam.');
    return;
  }

  isLoggingVisit = true;
  console.log('Rozpoczynam zapis logu...');

  try {
    const now = new Date();
    const date = now.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const day = capitalizeFirstLetter(now.toLocaleDateString('pl-PL', { weekday: 'long' }));
    const time = now.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
    const ip = await getIp();
    const location = await getLocation(ip);
    const userAgent = navigator.userAgent;
    const device = getDeviceType(userAgent);
    const isp = location.isp || 'Nieznany dostawca';
    const timestamp = now.getTime();

    const isDuplicate = await checkDuplicateLog(ip, device, timestamp);
    if (isDuplicate) {
      console.log('Duplikat logu, pomijam zapis.');
      return;
    }

    const logEntry = { date, day, time, ip, location, device, isp, timestamp };
    const logsRef = ref(db, 'logs');
    const newLogRef = push(logsRef);

    await set(newLogRef, logEntry);
    console.log('Log zapisany:', logEntry);
    sessionStorage.setItem('visitLogged', 'true');

    await cleanupLogs();
  } catch (error) {
    console.error('Błąd zapisu logu:', error);
  } finally {
    isLoggingVisit = false;
  }
}

async function checkDuplicateLog(ip, device, timestamp) {
  const logsRef = ref(db, 'logs');
  return new Promise((resolve) => {
    get(logsRef).then((snapshot) => {
      const logsData = snapshot.val();
      if (!logsData) {
        resolve(false);
        return;
      }
      const logs = Object.values(logsData);
      const tenMinutesAgo = timestamp - (10 * 60 * 1000); // 10 minut
      const isDuplicate = logs.some(log =>
        log.ip === ip &&
        log.device === device &&
        log.timestamp > tenMinutesAgo
      );
      resolve(isDuplicate);
    }).catch((error) => {
      console.error('Błąd odczytu logów w checkDuplicateLog:', error);
      resolve(false);
    });
  });
}

async function cleanupLogs() {
  const now = Date.now();
  const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000); // 30 dni
  const logsRef = ref(db, 'logs');
  const snapshot = await get(logsRef);
  const logs = [];
  const toRemove = [];

  if (!snapshot.exists()) return;

  snapshot.forEach(child => {
    const key = child.key;
    const log = child.val();
    if (log.timestamp < thirtyDaysAgo) {
      toRemove.push(key);
    } else {
      logs.push({ key, timestamp: log.timestamp });
    }
  });

  for (const key of toRemove) {
    await remove(ref(db, `logs/${key}`));
  }

  if (logs.length > 100) {
    logs.sort((a, b) => a.timestamp - b.timestamp); // Najstarsze pierwsze
    const numToRemove = logs.length - 100;
    for (let i = 0; i < numToRemove; i++) {
      await remove(ref(db, `logs/${logs[i].key}`));
    }
  }
}

async function getIp() {
  const cacheKey = 'ip_data';
  const cacheTimeKey = 'ip_time';
  const cacheDuration = 15 * 60 * 1000; // 15 minut
  const cachedData = getCachedData(cacheKey, cacheTimeKey, cacheDuration);
  if (cachedData) return cachedData.ip;

  try {
    const data = await retryFetch('https://api.ipify.org?format=json');
    setCachedData(cacheKey, cacheTimeKey, data);
    return data.ip || 'Nieznany IP';
  } catch (error) {
    console.error('Błąd pobierania IP:', error);
    return 'Nieznany IP';
  }
}

async function getLocation(ip) {
  const cacheKey = `location_${ip}`;
  const cacheTimeKey = `${cacheKey}_time`;
  const cacheDuration = 24 * 60 * 60 * 1000; // 24 godziny
  const cachedLocation = getCachedData(cacheKey, cacheTimeKey, cacheDuration);
  if (cachedLocation) return cachedLocation;

  try {
    const apiKey = 'ira_OaXnmZZCu9yfhUiomWbVy6blFQmAoI0BrILc';
    const data = await retryFetch(`https://api.ipregistry.co/${ip}?key=${apiKey}`);
    const location = {
      city: data.location?.city || 'Nieznane miasto',
      country: data.location?.country?.name || 'Nieznany kraj',
      isp: data.connection?.organization || 'Nieznany dostawca'
    };
    setCachedData(cacheKey, cacheTimeKey, location);
    return location;
  } catch (error) {
    console.error('Błąd pobierania lokalizacji:', error);
    return { city: 'Nieznane miasto', country: 'Nieznany kraj', isp: 'Nieznany dostawca' };
  }
}

function getDeviceType(userAgent) {
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'Tablet';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Windows') || userAgent.includes('Linux')) return 'PC';
  return 'Inne';
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function retryFetch(url, options = {}, retries = 2, delay = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`Błąd HTTP: ${response.status}`);
      return await response.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

function setCachedData(cacheKey, cacheTimeKey, data) {
  localStorage.setItem(cacheKey, JSON.stringify(data));
  localStorage.setItem(cacheTimeKey, Date.now().toString());
}

function getCachedData(cacheKey, cacheTimeKey, cacheDuration) {
  const cachedData = localStorage.getItem(cacheKey);
  const cachedTime = localStorage.getItem(cacheTimeKey);
  const now = Date.now();

  if (cachedData && cachedTime && (now - parseInt(cachedTime) < cacheDuration)) {
    return JSON.parse(cachedData);
  }
  return null;
}

// Funkcja do ładowania i wyświetlania logów w sekcji Społeczność
async function loadLogs() {
  const logTableBody = document.getElementById('logTableBody');
  if (!logTableBody) {
    console.error('Nie znaleziono elementu logTableBody');
    return;
  }

  try {
    console.log('Próba odczytu logów z:', ref(db, 'logs').path.toString());
    console.log('Aktualny użytkownik:', auth.currentUser);

    // Pobierz logi
    const logsRef = ref(db, 'logs');
    const logsSnapshot = await get(logsRef);
    if (!logsSnapshot.exists()) {
      console.log('Brak danych w ścieżce /logs');
      logTableBody.innerHTML = '<tr><td colspan="6">Brak logów do wyświetlenia.</td></tr>';
      return;
    }

    const logs = [];
    logsSnapshot.forEach(child => {
      const log = child.val();
      logs.push(log);
    });

    // Sortuj logi malejąco po timestamp (najnowsze na górze)
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Pobierz użytkowników i ich lastIp
    console.log('Próba odczytu użytkowników z:', ref(db, 'users').path.toString());
    const usersRef = ref(db, 'users');
    const usersSnapshot = await get(usersRef).catch(error => {
      console.error('Błąd odczytu użytkowników:', error);
      return null;
    });
    const userIpMap = {};
    if (usersSnapshot && usersSnapshot.exists()) {
      usersSnapshot.forEach(userChild => {
        const userData = userChild.val();
        if (userData.lastIp && userData.customUsername) {
          userIpMap[userData.lastIp] = userData.customUsername;
        }
      });
    } else {
      console.warn('Brak danych użytkowników lub brak uprawnień do /users');
    }

    // Wypełnij tabelę
    logTableBody.innerHTML = '';
    logs.forEach(log => {
      const row = document.createElement('tr');
      const ipDisplay = log.ip || 'Brak';
      const userName = userIpMap[log.ip] ? `<br>(${userIpMap[log.ip]})` : '';
      row.innerHTML = `
        <td>${log.date || 'Brak'}</td>
        <td>${log.day || 'Brak'}</td>
        <td>${log.time || 'Brak'}</td>
        <td>${ipDisplay}${userName}</td>
        <td>${log.location.city || 'Nieznane miasto'}<br>${log.location.country || 'Nieznany kraj'}</td>
        <td>${log.device || 'Brak'}<br>${log.isp || 'Nieznany dostawca'}</td>
      `;
      logTableBody.appendChild(row);
    });

    // Ustaw przewijanie na górę tabeli po załadowaniu
    const tableWrapper = document.querySelector('.table-wrapper');
    if (tableWrapper) tableWrapper.scrollTop = 0;
  } catch (error) {
    console.error('Błąd ładowania logów:', error);
    if (error.message.includes('Permission denied')) {
      logTableBody.innerHTML = '<tr><td colspan="6">Brak uprawnień do wyświetlenia logów. Upewnij się, że reguły Firebase zezwalają na odczyt ścieżki /logs.</td></tr>';
    } else {
      logTableBody.innerHTML = '<tr><td colspan="6">Błąd ładowania logów: ${error.message}. Spróbuj ponownie później.</td></tr>';
    }
  }
}

// Obsługa stanu zalogowania z komunikatem wylogowania
let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  if (!user && wasLoggedIn) {
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Inicjalizacja: ustawienie początkowego stanu i logowanie wizyty
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
  logVisit();

  // Pobieramy zakładki i element content-wrapper
  const navItems = document.querySelectorAll('.nav-item');
  const contentWrapper = document.getElementById('content-wrapper');

  // Domyślna zawartość dla strony głównej
  const defaultContent = contentWrapper ? contentWrapper.innerHTML : '';

  // Funkcja do ładowania zawartości sekcji
  async function loadSection(section) {
    if (!contentWrapper) return;
    try {
      let contentHtml;
      if (section === 'strona-glowna') {
        contentHtml = defaultContent;
      } else {
        const response = await fetch(`${section}.html`);
        if (!response.ok) throw new Error('Nie udało się załadować sekcji');
        contentHtml = await response.text();
      }
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

      navItems.forEach(item => item.classList.remove('active'));
      const activeItem = document.querySelector(`.nav-item[data-section="${section}"]`);
      if (activeItem) activeItem.classList.add('active');

      // Ładuj logi dla sekcji Społeczność
      if (section === 'spolecznosc') {
        await loadLogs();
      }
    } catch (error) {
      console.error('Błąd podczas ładowania sekcji:', error);
      contentWrapper.innerHTML = '<div class="content"><h2>Błąd</h2><p>Nie udało się załadować sekcji.</p></div>';
    }
  }

  // Obsługa kliknięć w zakładki
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.getAttribute('data-section');
      loadSection(section);
    });
  });

  // Załaduj domyślną sekcję przy starcie
  loadSection('strona-glowna');
});
