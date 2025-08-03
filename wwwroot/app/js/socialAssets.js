import { renderSocialImage } from './graphicsEngine.js';
import { getEventMetadata, getMatchLogEntry } from './firebase.js';
import { getDatabaseInstance } from './firebaseApp.js';
import { ref, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const metaCache = new Map();

async function getCachedEventMeta(eventId) {
  if (!metaCache.has(eventId)) {
    metaCache.set(eventId, getEventMetadata(eventId));
  }
  return await metaCache.get(eventId);
}

export async function generateSocialAssets(eventId, logId, style, options = {}) {
  const entry = await getMatchLogEntry(eventId, logId);
  const meta = await getCachedEventMeta(eventId);
  const dyn = {
    homeLogo: `/assets/logos/${meta.homeSlug}.png`,
    awayLogo: `/assets/logos/${meta.awaySlug}.png`,
    portrait: `/assets/portraits/${entry.playerId}.jpg`,
    playerName: entry.playerName,
    eventType: entry.eventType,
    scoreline: `${meta.scoreHome} – ${meta.scoreAway}`,
    time: entry.time
  };
  const ratios = { '9x16':[1080,1920], '1x1':[1080,1080], '2x3':[1080,1620] };
  const results = await Promise.all(Object.entries(ratios).map(async ([ratio,[w,h]]) => {
    const blob = await renderSocialImage({templateStyle:style, aspect:ratio, data:dyn, size:[w,h], options});
    const path = `social/${eventId}/${logId}-${ratio}.jpg`;
    await uploadBlobAsJpg(blob, path);
    return [ratio, `../assets/${path}`];
  }));
  return Object.fromEntries(results);
}

export async function generateFinalScoreAssets(eventId, style, options = {}) {
  const db = getDatabaseInstance();
  const [meta, sbSnap] = await Promise.all([
    getCachedEventMeta(eventId),
    get(ref(db, `scoreboard/${eventId}`)).then(s => s.val())
  ]);
  const scores = sbSnap?.scores || [meta.scoreHome, meta.scoreAway];
  const dyn = {
    homeLogo: `/assets/logos/${meta.homeSlug}.png`,
    awayLogo: `/assets/logos/${meta.awaySlug}.png`,
    eventType: 'Full Time',
    scoreline: `${scores[0]} – ${scores[1]}`,
    playerName: '',
    time: ''
  };
  const ratios = { '9x16':[1080,1920], '1x1':[1080,1080], '2x3':[1080,1620] };
  const results = await Promise.all(Object.entries(ratios).map(async ([ratio,[w,h]]) => {
    const blob = await renderSocialImage({templateStyle:style, aspect:ratio, data:dyn, size:[w,h], options});
    const path = `social/${eventId}/final-${ratio}.jpg`;
    await uploadBlobAsJpg(blob, path);
    return [ratio, `../assets/${path}`];
  }));
  return Object.fromEntries(results);
}

async function uploadBlobAsJpg(blob, path) {
  const fd = new FormData();
  fd.append('file', blob, 'image.jpg');
  fd.append('path', path);
  const res = await fetch('../upload.php', { method:'POST', body: fd, credentials: 'same-origin' });
  if (!res.ok) throw new Error('Upload failed');
}
