import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js';
import { getDatabase, ref, set, get, query, orderByChild, equalTo, onValue, remove } from 'https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js';

// Inicjalizacja Firebase
console.groupCollapsed("Inicjalizacja Firebase");
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
console.groupEnd();

// Funkcja do pobierania IP użytkownika
async function getUserIp() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Błąd pobierania IP:', error);
    return 'unknown';
  }
}

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  console.groupCollapsed("Logowanie");
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const userIp = await getUserIp();

    // Sprawdź czy użytkownik ma już wybrany customUsername
    const userRef = ref(db, 'users/' + user.uid);
    const userSnapshot = await get(userRef);
    
    if (!userSnapshot.exists() || !userSnapshot.val().customUsername) {
      showUsernameModal(user, userIp);
    } else {
      await set(ref(db, 'users/' + user.uid), {
        ...userSnapshot.val(),
        lastLogin: new Date().toISOString(),
        lastIp: userIp
      });
    }
  } catch (error) {
    console.error('Błąd logowania:', error);
    alert('Błąd logowania: ' + error.message);
  }
  console.groupEnd();
}

// Funkcja do wyświetlania modala wyboru username (z dodanym lastIp)
function showUsernameModal(user, userIp) {
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('usernameInput');
  const error = document.getElementById('usernameError');
  const submitButton = document.getElementById('submitUsernameButton');

  modal.style.display = 'block';
  input.value = '';
  error.style.display = 'none';

  submitButton.onclick = async () => {
    const username = input.value.trim();

    // Walidacja username
    if (username.length < 3) {
      error.textContent = 'Username musi mieć co najmniej 3 znaki.';
      error.style.display = 'block';
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      error.textContent = 'Username może zawierać tylko litery, cyfry i podkreślniki.';
      error.style.display = 'block';
      return;
    }

    try {
      // Sprawdź unikalność username
      const usernamesRef = ref(db, 'usernames');
      const queryRef = query(usernamesRef, orderByChild('username'), equalTo(username));
      const snapshot = await get(queryRef);
      if (snapshot.exists()) {
        error.textContent = 'Ten username jest już zajęty.';
        error.style.display = 'block';
        return;
      }

      // Zapisz dane użytkownika
      const userData = {
        customUsername: username,
        email: user.email,
        lastLogin: new Date().toISOString(),
        lastIp: userIp
      };
      await set(ref(db, 'users/' + user.uid), userData);
      await set(ref(db, 'usernames/' + user.uid), { username: username });

      modal.style.display = 'none';
      alert('Zalogowano pomyślnie! Username został zapisany.');
    } catch (error) {
      console.error('Błąd zapisu:', error);
      error.textContent = 'Błąd zapisu do bazy danych. Spróbuj ponownie.';
      error.style.display = 'block';
    }
  };
}

// Funkcje panelu logowania (bez zmian)
function showLoginPanel() { /* ... */ }

// Funkcja aktualizacji sekcji logowania
function updateLoginSection(user) { /* ... */ }

// Funkcja wylogowania
function handleLogout() { /* ... */ }

// Obsługa stanu zalogowania
let wasLoggedIn = false;
onAuthStateChanged(auth, (user) => {
  if (!user && wasLoggedIn) {
    alert('Wylogowano pomyślnie!');
  }
  wasLoggedIn = !!user;
  updateLoginSection(user);
});

// Inicjalizacja DOM
document.addEventListener('DOMContentLoaded', () => {
  updateLoginSection(auth.currentUser);
});

// Funkcje do obsługi logów
async function fetchUsers() {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  const users = {};
  
  if (snapshot.exists()) {
    snapshot.forEach(childSnapshot => {
      users[childSnapshot.key] = childSnapshot.val();
    });
  }
  
  return users;
}

async function updateLogs() {
  console.groupCollapsed("Aktualizacja logów");
  const logsRef = ref(db, 'logs');
  const users = await fetchUsers();
  
  onValue(logsRef, async (snapshot) => {
    const logsData = snapshot.val();
    let logs = logsData ? Object.entries(logsData).map(([key, value]) => ({ key, ...value })) : [];
    logs.sort((a, b) => b.timestamp - a.timestamp);

    // Ogranicz do 100 ostatnich logów
    if (logs.length > 100) {
      const logsToDelete = logs.slice(100);
      logs = logs.slice(0, 100);
      logsToDelete.forEach(log => remove(ref(db, `logs/${log.key}`)));
    }

    displayLogs(logs, users);
  }, { onlyOnce: true });
  console.groupEnd();
}

function displayLogs(logs, users) {
  console.groupCollapsed("Wyświetlanie logów");
  const logTableBody = document.getElementById('logsTableBody');
  
  if (!logTableBody) {
    console.log('Tabela logów nie znaleziona');
    return;
  }

  logTableBody.innerHTML = '';

  if (logs.length === 0) {
    logTableBody.innerHTML = '<tr><td colspan="6">Brak logów.</td></tr>';
    return;
  }

  logs.forEach(log => {
    const row = document.createElement('tr');
    
    // Znajdź użytkownika z pasującym lastIp
    let username = null;
    for (const uid in users) {
      if (users[uid].lastIp === log.ip) {
        username = users[uid].customUsername;
        break;
      }
    }
    
    // Formatuj datę (DD.MM.YYYY)
    const dateParts = log.date.split('-');
    const formattedDate = `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}`;
    
    row.innerHTML = `
      <td>${formattedDate}</td>
      <td>${log.day || 'Brak'}</td>
      <td>${log.time || 'Brak'}</td>
      <td>
        ${log.ip || 'Brak'}
        ${username ? `<br><span class="username-tag">(${username})</span>` : ''}
      </td>
      <td>
        ${log.location?.city || 'Nieznane miasto'}<br>
        ${log.location?.country || 'Nieznany kraj'}
      </td>
      <td>
        ${log.device || 'Brak'}<br>
        ${log.isp || 'Nieznany dostawca'}
      </td>
    `;
    logTableBody.appendChild(row);
  });
  console.groupEnd();
}

// Wywołaj aktualizację logów po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
  // Sprawdź czy jesteśmy w sekcji społeczności
  if (window.location.hash === '#spolecznosc' || 
      document.querySelector('.nav-item[data-section="spolecznosc"].active')) {
    updateLogs();
  }
});

// Globalna funkcja do aktualizacji logów
window.updateLogs = updateLogs;
