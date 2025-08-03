import { renderSocialImage } from './graphicsEngine.js';
import { getEventMetadata, getMatchLogEntry } from './firebase.js';

export async function generateSocialAssets(eventId, logId, style, options = {}) {
  const entry = await getMatchLogEntry(eventId, logId);
  const meta = await getEventMetadata(eventId);
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
  const out = {};
  for (const [ratio,[w,h]] of Object.entries(ratios)) {
    const blob = await renderSocialImage({templateStyle:style, aspect:ratio, data:dyn, size:[w,h], options});
    const path = `social/${eventId}/${logId}-${ratio}.jpg`;
    await uploadBlobAsJpg(blob, path);
    out[ratio] = `assets/${path}`;
  }
  return out;
}

async function uploadBlobAsJpg(blob, path) {
  const fd = new FormData();
  fd.append('file', blob, 'image.jpg');
  fd.append('path', path);
  await fetch('../upload.php', { method:'POST', body: fd });
}
