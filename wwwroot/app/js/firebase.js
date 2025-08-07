// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getDatabase, ref, set, get, onValue, update, remove, push } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

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

// Resolve relative asset paths for logos/images
export function resolveAssetPath(path) {
  if (!path) return '';
  if (/^https?:\/\//.test(path) || path.startsWith('assets/') || path.startsWith('/')) {
    return path;
  }
  return `assets/${path}`;
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

// Teams helpers
export function listenTeams(eventId, cb) {
  const r = ref(db, `teams/${eventId}`);
  let innerUnsub = null;
  const outerUnsub = onValue(r, snap => {
    const val = snap.val();
    if (val && val.link) {
      if (innerUnsub) innerUnsub();
      innerUnsub = onValue(ref(db, `teams/${val.link}`), s2 => cb(s2.val(), val.link));
    } else {
      if (innerUnsub) {
        innerUnsub();
        innerUnsub = null;
      }
      cb(val, eventId);
    }
  });
  return () => {
    outerUnsub();
    if (innerUnsub) innerUnsub();
  };
}

export async function getTeams(eventId) {
  const snap = await get(ref(db, `teams/${eventId}`));
  const val = snap.val();
  if (val && val.link) {
    const snap2 = await get(ref(db, `teams/${val.link}`));
    return snap2.val();
  }
  return val;
}

export function setTeams(eventId, data) {
  return set(ref(db, `teams/${eventId}`), data);
}

// Speakers helpers
export function listenSpeakers(eventId, cb) {
  return onValue(ref(db, `speakers/${eventId}`), snap => cb(snap.val()));
}

export function setSpeakers(eventId, data) {
  return set(ref(db, `speakers/${eventId}`), data);
}

// Speaker banner helpers
export function listenSpeakerBanners(eventId, cb) {
  return onValue(ref(db, `speakerBanners/${eventId}`), snap => cb(snap.val()));
}

export function setSpeakerBanners(eventId, data) {
  return set(ref(db, `speakerBanners/${eventId}`), data);
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

// Sponsors helpers
export function getSponsors(eventId) {
  return get(ref(db, `sponsors/${eventId}`)).then(snap => snap.val());
}
export function setSponsors(eventId, sponsors) {
  return set(ref(db, `sponsors/${eventId}`), sponsors);
}
export function updateSponsors(eventId, sponsors) {
  return update(ref(db, `sponsors/${eventId}`), sponsors);
}
export function listenSponsors(eventId, cb) {
  return onValue(ref(db, `sponsors/${eventId}`), snap => cb(snap.val()));
}

// Sponsor placement helpers
export function getSponsorPlacements(eventId) {
  return get(ref(db, `sponsorPlacements/${eventId}`)).then(snap => snap.val());
}
export function setSponsorPlacements(eventId, data) {
  return set(ref(db, `sponsorPlacements/${eventId}`), data);
}
export function updateSponsorPlacements(eventId, data) {
  return update(ref(db, `sponsorPlacements/${eventId}`), data);
}
export function listenSponsorPlacements(eventId, cb) {
  return onValue(ref(db, `sponsorPlacements/${eventId}`), snap => cb(snap.val()));
}

// Sponsor log helper
export function addSponsorLog(eventId, entry) {
  const r = ref(db, `sponsorLog/${eventId}`);
  return push(r, entry);
}
export function getSponsorLog(eventId) {
  return get(ref(db, `sponsorLog/${eventId}`)).then(snap => snap.val());
}
export function listenSponsorLog(eventId, cb) {
  return onValue(ref(db, `sponsorLog/${eventId}`), snap => cb(snap.val()));
}

// Match log helpers
export function addMatchLog(eventId, entry, notify = false) {
  const r = ref(db, `matchLog/${eventId}`);
  const newRef = push(r);
  return set(newRef, entry).then(() => {
    if (notify) set(ref(db, `graphicsNotify/${eventId}/events`), Date.now());
    return newRef.key;
  });
}
export function updateMatchLogEntry(eventId, id, entry) {
  return set(ref(db, `matchLog/${eventId}/${id}`), entry);
}
export function getMatchLogEntry(eventId, id) {
  return get(ref(db, `matchLog/${eventId}/${id}`)).then(snap => ({ id, ...snap.val() }));
}
export function listenMatchLog(eventId, cb) {
  return onValue(ref(db, `matchLog/${eventId}`), snap => {
    const val = snap.val() || {};
    const arr = Object.entries(val).map(([k,v])=>({ id:k, ...v }));
    cb(arr);
  });
}
export function getMatchLog(eventId) {
  return get(ref(db, `matchLog/${eventId}`)).then(snap => {
    const val = snap.val() || {};
    return Object.entries(val).map(([k,v])=>({ id:k, ...v }));
  });
}
export function setMatchLog(eventId, entries) {
  const obj = {};
  entries.forEach(e => { const id = e.id || push(ref(db, `matchLog/${eventId}`)).key; obj[id] = { ...e }; });
  return set(ref(db, `matchLog/${eventId}`), obj);
}

// Graphics notifications
export function listenGraphicsNotify(eventId, cb) {
  return onValue(ref(db, `graphicsNotify/${eventId}`), snap => cb(snap.val() || {}));
}
export function clearGraphicsNotify(eventId, key) {
  return set(ref(db, `graphicsNotify/${eventId}/${key}`), null);
}

// Tournament helpers
export function getTournament(eventId) {
  return get(ref(db, `tournament/${eventId}`)).then(snap => snap.val());
}
export function setTournament(eventId, data) {
  return set(ref(db, `tournament/${eventId}`), data);
}
export function updateTournament(eventId, data) {
  return update(ref(db, `tournament/${eventId}`), data);
}
export function listenTournament(eventId, cb) {
  return onValue(ref(db, `tournament/${eventId}`), snap => cb(snap.val()));
}

// Presentation helpers
export function getPresentation(eventId) {
  return get(ref(db, `presentation/${eventId}`)).then(snap => snap.val());
}
export function setPresentation(eventId, data) {
  return set(ref(db, `presentation/${eventId}`), data);
}
export function updatePresentation(eventId, data) {
  return update(ref(db, `presentation/${eventId}`), data);
}
export function listenPresentation(eventId, cb) {
  return onValue(ref(db, `presentation/${eventId}`), snap => cb(snap.val()));
}

// Plan features helpers
export function getPlanFeatures() {
  return get(ref(db, 'planFeatures')).then(snap => snap.val());
}
export function updatePlanFeature(plan, feature, value) {
  return update(ref(db, `planFeatures/${plan}`), { [feature]: value });
}

export async function getUserFeatures(userId) {
  let tier = 'bronze';
  if (userId && userId.startsWith('local-')) {
    const email = userId.slice(6);
    try {
      const locals = JSON.parse(localStorage.getItem('localUsers') || '{}');
      tier = locals[email]?.tier || 'bronze';
    } catch {}
  } else if (userId) {
    const u = await getUser(userId).catch(() => null);
    tier = u?.tier || 'bronze';
  }
  const plans = await getPlanFeatures().catch(() => ({}));
  return plans?.[tier] || {};
}
