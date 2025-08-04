import { requireAuth } from './auth.js';
import './components/topBar.js';
import { renderSocialPanel } from './components/socialPanel.js';

const eventId = new URLSearchParams(location.search).get('event_id') || 'demo';
await requireAuth(`social.html?event_id=${eventId}`);
renderSocialPanel(document.getElementById('app'), eventId);
