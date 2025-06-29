import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderSportPanel } from './components/sportPanel.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { getEventMetadata, updateEventMetadata } from './firebase.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

async function init() {
  const user = await requireAuth(`sports.html?event_id=${eventId}`);
  const meta = await getEventMetadata(eventId) || { eventType: 'sports', sport: 'Football' };
  if (!meta.eventType) meta.eventType = 'sports';
  if (!meta.sport) meta.sport = 'Football';

  const topBar = document.createElement('top-bar');
  topBar.setAttribute('event-type', meta.eventType);
  if (user && user.email === 'ryanadmin') topBar.setAttribute('is-admin','true');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ eventId }); modal.classList.remove('hidden'); });
  document.getElementById('top-bar').appendChild(topBar);

  renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Sports Admin', firebaseStatus:'Connected to Firebase' }, { overlay:false, listener:false, sport:false, clock:true, atem:false, obs:false });

  const left = document.getElementById('left');
  const right = document.getElementById('right');

  const sportPanel = document.createElement('div');
  left.appendChild(sportPanel);
  const scoreboardPanel = document.createElement('div');
  left.appendChild(scoreboardPanel);
  const teamsPanel = document.createElement('div');
  right.appendChild(teamsPanel);

  renderSportPanel(sportPanel, meta, async (id,sport) => {
    await updateEventMetadata(eventId, { ...meta, sport });
    meta.sport = sport;
    renderScoreboardPanel(scoreboardPanel, sport, eventId);
    renderTeamsPanel(teamsPanel, eventId, sport);
  });
  renderScoreboardPanel(scoreboardPanel, meta.sport, eventId);
  renderTeamsPanel(teamsPanel, eventId, meta.sport);
}

document.addEventListener('DOMContentLoaded', init);
