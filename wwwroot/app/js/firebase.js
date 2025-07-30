// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXUd4iKZWHeiWe_2gblxWE9uFEXS4pHAI",
  authDomain: "pineappletapped-graphic-system.firebaseapp.com",
  projectId: "pineappletapped-graphic-system",
  storageBucket: "pineappletapped-graphic-system.firebasestorage.app",
  messagingSenderId: "1028817053613",
  appId: "1:1028817053613:web:c5061b138676641bde2324",
  measurementId: "G-2Y6YYBF5R2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app, "https://pineappletapped-graphic-system-default-rtdb.europe-west1.firebasedatabase.app");

// Event metadata helpers
export function setEventMetadata(eventId, metadata) {
  return set(ref(db, `events/${eventId}`), metadata);
}
export function updateEventMetadata(eventId, metadata) {
  return update(ref(db, `events/${eventId}`), metadata);
}
export function getEventMetadata(eventId) {
  return get(ref(db, `events/${eventId}`)).then(snap => snap.val());
}
export function listenEventMetadata(eventId, callback) {
  return onValue(ref(db, `events/${eventId}`), (snapshot) => {
    callback(snapshot.val());
  });
}
export function getAllEventsMetadata() {
  return get(ref(db, 'events')).then(snap => snap.val());
}

export function deleteEvent(eventId) {
  return Promise.all([
    remove(ref(db, `events/${eventId}`)),
    remove(ref(db, `overlays/${eventId}`)),
    remove(ref(db, `graphics/${eventId}`)),
    remove(ref(db, `graphicsDev/${eventId}`)),
    remove(ref(db, `favorites/${eventId}`)),
    remove(ref(db, `branding/${eventId}`))
  ]);
}

// Overlay state helpers (eventId-scoped)
export function setOverlayState(eventId, state) {
  return set(ref(db, `overlays/${eventId}`), state);
}

export function updateOverlayState(eventId, state) {
  return update(ref(db, `overlays/${eventId}`), state);
}

export function listenOverlayState(eventId, callback) {
  return onValue(ref(db, `overlays/${eventId}`), (snapshot) => {
    callback(snapshot.val());
  });
}

export function getOverlayState(eventId) {
  return get(ref(db, `overlays/${eventId}`)).then(snap => snap.val());
}

// Graphics helpers (eventId-scoped)
export function setGraphicsData(eventId, graphics, mode = 'live') {
  const path = mode === 'dev' ? `graphicsDev/${eventId}` : `graphics/${eventId}`;
  return set(ref(db, path), graphics);
}
export function updateGraphicsData(eventId, graphics, mode = 'live') {
  const path = mode === 'dev' ? `graphicsDev/${eventId}` : `graphics/${eventId}`;
  return update(ref(db, path), graphics);
}
export function listenGraphicsData(eventId, callback, mode = 'live') {
  const path = mode === 'dev' ? `graphicsDev/${eventId}` : `graphics/${eventId}`;
  return onValue(ref(db, path), (snapshot) => {
    callback(snapshot.val());
  });
}
export function getGraphicsData(eventId, mode = 'live') {
  const path = mode === 'dev' ? `graphicsDev/${eventId}` : `graphics/${eventId}`;
  return get(ref(db, path)).then(snap => snap.val());
}

// Favorites helpers (eventId-scoped)
export function setFavorites(eventId, data) {
  return set(ref(db, `favorites/${eventId}`), data);
}
export function updateFavorites(eventId, data) {
  return update(ref(db, `favorites/${eventId}`), data);
}
export function listenFavorites(eventId, callback) {
  return onValue(ref(db, `favorites/${eventId}`), (snapshot) => {
    callback(snapshot.val());
  });
}
export function getFavorites(eventId) {
  return get(ref(db, `favorites/${eventId}`)).then(snap => snap.val());
}

// Branding helpers (eventId-scoped)
export function setBranding(eventId, branding) {
  return set(ref(db, `branding/${eventId}`), branding);
}
export function updateBranding(eventId, branding) {
  return update(ref(db, `branding/${eventId}`), branding);
}
export function listenBranding(eventId, callback) {
  return onValue(ref(db, `branding/${eventId}`), (snapshot) => {
    callback(snapshot.val());
  });
}
export function getBranding(eventId) {
  return get(ref(db, `branding/${eventId}`)).then(snap => snap.val());
}

// User management stubs
export function setUser(userId, userData) {
  return set(ref(db, `users/${userId}`), userData);
}
export function updateUser(userId, userData) {
  return update(ref(db, `users/${userId}`), userData);
}
export function getUser(userId) {
  return get(ref(db, `users/${userId}`)).then(snap => snap.val());
}
export function listenUser(userId, callback) {
  return onValue(ref(db, `users/${userId}`), (snapshot) => {
    callback(snapshot.val());
  });
}
export function getAllUsers() {
  return get(ref(db, 'users')).then(snap => snap.val());
}

// User branding helpers
export function setUserBranding(userId, branding) {
  return set(ref(db, `userBranding/${userId}`), branding);
}
export function updateUserBranding(userId, branding) {
  return update(ref(db, `userBranding/${userId}`), branding);
}
export function getUserBranding(userId) {
  return get(ref(db, `userBranding/${userId}`)).then(snap => snap.val());
}
export function listenUserBranding(userId, cb) {
  return onValue(ref(db, `userBranding/${userId}`), snap => cb(snap.val()));
}
