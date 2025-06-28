import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getOrInitApp } from "./firebaseApp.js";
import { setUser, getUser } from './firebase.js';

const DEFAULT_ADMIN = { email: 'ryanadmin', password: 'password' };
const LOCAL_USERS_KEY = 'localUsers';

const auth = getAuth(getOrInitApp());
setPersistence(auth, browserLocalPersistence);

function getLocalUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    if (!users[DEFAULT_ADMIN.email]) {
      users[DEFAULT_ADMIN.email] = { password: DEFAULT_ADMIN.password, tier: 'eight' };
    }
    return users;
  } catch {
    return { [DEFAULT_ADMIN.email]: { password: DEFAULT_ADMIN.password, tier: 'eight' } };
  }
}

function saveLocalUsers(users) {
  localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
}

function setLocalLoggedIn(email) {
  localStorage.setItem('loginTime', Date.now().toString());
  localStorage.setItem('localUser', email);
}

function clearLocalLogin() {
  localStorage.removeItem('loginTime');
  localStorage.removeItem('localUser');
}

export function onAuth(cb) {
  const localEmail = localStorage.getItem('localUser');
  if (localEmail) {
    cb({ uid: 'local-' + localEmail, email: localEmail });
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export function login(email, password) {
  const localUsers = getLocalUsers();
  if (localUsers[email] && localUsers[email].password === password) {
    setLocalLoggedIn(email);
    return Promise.resolve({ user: { uid: 'local-' + email, email } });
  }
  return signInWithEmailAndPassword(auth, email, password).then(res => {
    localStorage.setItem('loginTime', Date.now().toString());
    return res;
  });
}

export function register(email, password, tier, subId) {
  return createUserWithEmailAndPassword(auth, email, password).then(async res => {
    localStorage.setItem('loginTime', Date.now().toString());
    await setUser(res.user.uid, { email, tier, subscription_id: subId });
    return res;
  }).catch(err => {
    const users = getLocalUsers();
    if (!users[email]) {
      users[email] = { password, tier, subscription_id: subId };
      saveLocalUsers(users);
      setLocalLoggedIn(email);
      return { user: { uid: 'local-' + email, email } };
    }
    throw err;
  });
}

export function logout() {
  clearLocalLogin();
  return signOut(auth).catch(() => {});
}

export async function requireAuth(redirectUrl = '') {
  const loginTime = parseInt(localStorage.getItem('loginTime') || '0', 10);
  const localEmail = localStorage.getItem('localUser');
  if (localEmail && loginTime && Date.now() - loginTime < 8 * 60 * 60 * 1000) {
    const localUsers = getLocalUsers();
    const info = localUsers[localEmail] || {};
    if (!info.subscription_id && localEmail !== DEFAULT_ADMIN.email) {
      alert('Subscription required.');
      clearLocalLogin();
      window.location.href = 'index.html';
      return null;
    }
    return { uid: 'local-' + localEmail, email: localEmail };
  }
  if (localEmail) {
    clearLocalLogin();
  }
  if (loginTime && Date.now() - loginTime > 8 * 60 * 60 * 1000) {
    await logout();
  }
  return new Promise(resolve => {
    onAuthStateChanged(auth, user => {
      if (user) {
        getUser(user.uid).then(u => {
          if (!u?.subscription_id && user.email !== DEFAULT_ADMIN.email) {
            alert('Subscription required.');
            logout();
            window.location.href = 'index.html';
          } else {
            resolve(user);
          }
        });
      } else {
        const url = redirectUrl ? `index.html?redirect=${encodeURIComponent(redirectUrl)}` : 'index.html';
        window.location.href = url;
      }
    });
  });
}
