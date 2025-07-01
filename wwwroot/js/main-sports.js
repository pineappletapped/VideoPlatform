import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderLineupPanel } from './components/lineupPanel.js';
import { renderSportPanel } from './components/sportPanel.js';
import { renderGolfPanel } from './components/golfPanel.js';
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
  if (user && user.email === 'ryanadmin') topBar.setAttribute('is-admin','true');
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ eventId }); modal.classList.remove('hidden'); });
  document.getElementById('top-bar').appendChild(topBar);

  renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Sports Admin', firebaseStatus:'Connected to Firebase' }, { overlay:false, listener:false, sport:false, clock:true, atem:false, obs:false });

  const left = document.getElementById('left');
  const right = document.getElementById('right');
  const teamsTab = document.getElementById('teams');
  const lineupsTab = document.getElementById('lineups');

  const sportPanel = document.createElement('div');
  left.appendChild(sportPanel);
  const scoreboardPanel = document.createElement('div');
  left.appendChild(scoreboardPanel);
  const teamsPanel = document.createElement('div');
  teamsTab.appendChild(teamsPanel);
  const lineupPanel = document.createElement('div');
  lineupsTab.appendChild(lineupPanel);

  function renderBySport(s){
    if(s === 'Golf') {
      renderGolfPanel(scoreboardPanel, eventId);
      teamsTab.classList.add('hidden');
      lineupsTab.classList.add('hidden');
    } else {
      renderScoreboardPanel(scoreboardPanel, s, eventId);
      renderTeamsPanel(teamsPanel, eventId, s);
      renderLineupPanel(lineupPanel, eventId, s);
      teamsTab.classList.remove('hidden');
      lineupsTab.classList.remove('hidden');
    }
  }

  renderSportPanel(sportPanel, meta, async (id,sport) => {
    await updateEventMetadata(eventId, { ...meta, sport });
    meta.sport = sport;
    renderBySport(sport);
  });
  renderBySport(meta.sport);

  setupTabs();
}

document.addEventListener('DOMContentLoaded', init);

function setupTabs(){
  const buttons = document.querySelectorAll('#right-tabs [data-tab]');
  const contents = document.querySelectorAll('#right .tab-content');
  buttons.forEach(btn=>{
    btn.onclick = ()=>{
      const tab = btn.getAttribute('data-tab');
      buttons.forEach(b=>b.classList.remove('border-b-2','border-brand','text-brand','font-semibold'));
      btn.classList.add('border-b-2','border-brand','text-brand','font-semibold');
      contents.forEach(c=>{ if(c.id===tab) c.classList.remove('hidden'); else c.classList.add('hidden'); });
    };
  });
}
