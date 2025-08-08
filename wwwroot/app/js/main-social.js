import { requireAuth } from './auth.js';
import './components/topBar.js';
import { renderSocialPanel } from './components/socialPanel.js';
import { getUserFeatures, getEventMetadata } from './firebase.js';

const eventId = new URLSearchParams(location.search).get('event_id') || 'demo';
const user = await requireAuth(`social.html?event_id=${eventId}`);
const ev = await getEventMetadata(eventId).catch(()=>({})) || {};
const feats = await getUserFeatures(ev.owner || user.uid);
if (!feats.social) {
  alert('Social panel not available for your plan.');
  window.location.href = 'index.html';
} else {
  renderSocialPanel(document.getElementById('app'), eventId);
}
