import { auth, db } from './firebase';
import { ref, set } from 'firebase/database';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

// Funkcja do logowania przez Google
async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    console.log('Zalogowano przez Google:', user);

    // Zapis danych użytkownika do bazy danych
    await set(ref(db, 'users/' + user.uid), {
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
  loginPanel.innerHTML = `
    <h3>Logowanie</h3>
    <button id="googleSignInButton">Zaloguj przez Google</button>
    <button id="closePanelButton">Zamknij</button>
  `;
  document.body.appendChild(loginPanel);

  // Obsługa przycisku logowania przez Google
  document.getElementById('googleSignInButton').addEventListener('click', () => {
    signInWithGoogle();
    document.body.removeChild(loginPanel);
  });

  // Obsługa przycisku zamykania panelu
  document.getElementById('closePanelButton').addEventListener('click', () => {
    document.body.removeChild(loginPanel);
  });
}

// Obsługa kliknięcia w link "Zaloguj / Zarejestruj"
document.getElementById('loginLink').addEventListener('click', showLoginPanel);

// Obsługa stanu zalogowania
onAuthStateChanged(auth, (user) => {
  const loginDiv = document.querySelector('.login');
  if (user) {
    loginDiv.innerHTML = `Witaj, ${user.displayName} | <button id="signOutButton">Wyloguj</button>`;
    document.getElementById('signOutButton').addEventListener('click', () => {
      signOut(auth);
    });
  } else {
    loginDiv.innerHTML = 'Nie jesteś zalogowany | <span id="loginLink" style="cursor: pointer;">Zaloguj / Zarejestruj</span>';
    document.getElementById('loginLink').addEventListener('click', showLoginPanel);
  }
});
