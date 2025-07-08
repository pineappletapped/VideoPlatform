import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderLineupPanel } from './components/lineupPanel.js';
import { renderGolfPanel } from './components/golfPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { getEventMetadata } from './firebase.js';

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
  const statsTab = document.getElementById('stats');

  const scoreboardPanel = document.createElement('div');
  left.appendChild(scoreboardPanel);
  const teamsPanel = document.createElement('div');
  teamsTab.appendChild(teamsPanel);
  const lineupPanel = document.createElement('div');
  lineupsTab.appendChild(lineupPanel);
  const statsPanel = document.createElement('div');
  statsTab.appendChild(statsPanel);

  function renderBySport(s){
    if(s === 'Golf') {
      renderGolfPanel(scoreboardPanel, eventId);
      teamsTab.classList.add('hidden');
      lineupsTab.classList.add('hidden');
      renderStatsPanel(statsPanel, eventId);
    } else {
      renderScoreboardPanel(scoreboardPanel, s, eventId);
      renderTeamsPanel(teamsPanel, eventId, s);
      renderLineupPanel(lineupPanel, eventId, s);
      renderStatsPanel(statsPanel, eventId);
      teamsTab.classList.remove('hidden');
      lineupsTab.classList.remove('hidden');
    }
  }

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
