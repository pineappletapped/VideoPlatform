import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getOrInitApp } from "./firebaseApp.js";
import { setUser, getUser } from './firebase.js';

const DEFAULT_ADMIN = { email: 'ryanadmin', passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', role: 'userAdmin' };
const LOCAL_USERS_KEY = 'localUsers';

const auth = getAuth(getOrInitApp());
setPersistence(auth, browserLocalPersistence);

export function getLocalUsers() {
  try {
    const users = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    if (!users[DEFAULT_ADMIN.email]) {
      users[DEFAULT_ADMIN.email] = { passwordHash: DEFAULT_ADMIN.passwordHash, tier: 'gold', role: DEFAULT_ADMIN.role };
    }
    return users;
  } catch {
    return { [DEFAULT_ADMIN.email]: { passwordHash: DEFAULT_ADMIN.passwordHash, tier: 'gold', role: DEFAULT_ADMIN.role } };
  }
}

export function saveLocalUsers(users) {
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
    const users = getLocalUsers();
    const info = users[localEmail] || {};
    cb({ uid: 'local-' + localEmail, email: localEmail, role: info.role || 'userAdmin', parent: info.parent, events: info.events });
    return () => {};
  }
  return onAuthStateChanged(auth, cb);
}

export async function hashPassword(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function login(email, password) {
  const localUsers = getLocalUsers();
  const hashed = await hashPassword(password);
  if (localUsers[email] && localUsers[email].passwordHash === hashed) {
    setLocalLoggedIn(email);
    const info = localUsers[email] || {};
    return { user: { uid: 'local-' + email, email, role: info.role || 'userAdmin', parent: info.parent, events: info.events } };
  }
  return signInWithEmailAndPassword(auth, email, password).then(res => {
    localStorage.setItem('loginTime', Date.now().toString());
    return res;
  });
}

export async function register(email, password, tier, subId) {
  const locals = getLocalUsers();
  if (locals[email]) {
    return Promise.reject(new Error('Email already registered'));
  }
  return createUserWithEmailAndPassword(auth, email, password).then(async res => {
    localStorage.setItem('loginTime', Date.now().toString());
    await setUser(res.user.uid, { email, tier, subscription_id: subId });
    return res;
  }).catch(async err => {
    if (err.code === 'auth/email-already-in-use') {
      throw new Error('Email already registered');
    }
    const users = getLocalUsers();
    if (!users[email]) {
      const hashed = await hashPassword(password);
      users[email] = { passwordHash: hashed, tier, subscription_id: subId, role: 'userAdmin' };
      saveLocalUsers(users);
      setLocalLoggedIn(email);
      return { user: { uid: 'local-' + email, email, role: 'userAdmin' } };
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
  const eventMatch = /event_id=([^&]+)/.exec(redirectUrl);
  const requestedEvent = eventMatch ? decodeURIComponent(eventMatch[1]) : null;
  if (localEmail && loginTime && Date.now() - loginTime < 8 * 60 * 60 * 1000) {
    const localUsers = getLocalUsers();
    const info = localUsers[localEmail] || {};
    const parentInfo = info.parent ? localUsers[info.parent] : info;
    if (!parentInfo?.subscription_id && localEmail !== DEFAULT_ADMIN.email) {
      alert('Subscription required.');
      clearLocalLogin();
      window.location.href = 'index.html';
      return null;
    }
    if (requestedEvent && Array.isArray(info.events) && !info.events.includes(requestedEvent) && info.role !== 'userAdmin') {
      alert('Access denied.');
      clearLocalLogin();
      window.location.href = 'index.html';
      return null;
    }
    return { uid: 'local-' + localEmail, email: localEmail, role: info.role || 'userAdmin', parent: info.parent, events: info.events };
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
            resolve({ ...user, role: u?.role || 'userAdmin', parent: u?.parent });
          }
        });
      } else {
        const url = redirectUrl ? `index.html?redirect=${encodeURIComponent(redirectUrl)}` : 'index.html';
        window.location.href = url;
      }
    });
  });
}
