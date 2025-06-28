import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getOrInitApp } from "./firebaseApp.js";

const auth = getAuth(getOrInitApp());
setPersistence(auth, browserLocalPersistence);

export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}

export function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password).then(res => {
    localStorage.setItem('loginTime', Date.now().toString());
    return res;
  });
}

export function register(email, password) {
  return createUserWithEmailAndPassword(auth, email, password).then(res => {
    localStorage.setItem('loginTime', Date.now().toString());
    return res;
  });
}

export function logout() {
  localStorage.removeItem('loginTime');
  return signOut(auth);
}

export async function requireAuth(redirectUrl = '') {
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
  if (loginTime && Date.now() - loginTime > 8 * 60 * 60 * 1000) {
    await logout();
  }
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => {
      if (user) {
        resolve(user);
      } else {
        const url = redirectUrl ? `index.html?redirect=${encodeURIComponent(redirectUrl)}` : 'index.html';
        window.location.href = url;
      }
    });
  });
}
