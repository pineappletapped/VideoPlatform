import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderGolfPanel } from './components/golfPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { renderSponsorsPanel } from './components/sponsorsPanel.js';
import { getEventMetadata, updateEventMetadata, listenOverlayState, listenMatchLog } from './firebase.js';
import { getTeamLabel } from './sportsConfig.js';
import { getDatabaseInstance } from './firebaseApp.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

const db = getDatabaseInstance();
let teams = null;
let scoreboard = null;
let logs = [];

function formatTime(secs){
  return `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
}

function parseTime(str){
  const [m='0',s='0'] = str.split(':');
  return parseInt(m)*60 + parseInt(s);
}

function contrastColor(hex){
  let c = hex.replace('#','');
  if(c.length===3) c = c.split('').map(x=>x+x).join('');
  const r=parseInt(c.substr(0,2),16);
  const g=parseInt(c.substr(2,2),16);
  const b=parseInt(c.substr(4,2),16);
  const lum=(0.299*r+0.587*g+0.114*b)/255;
  return lum>0.6?'#000':'#fff';
}

function getTeam(key){
  if(!teams) return null;
  if(teams.teams){
    const idx = key==='a' ? (teams.currentA||0) : (teams.currentB||1);
    return teams.teams[idx];
  }
  return key==='a' ? teams.teamA : teams.teamB;
}

function renderScoreboard(){
  const el = document.getElementById('scoreboard-display');
  if(!el) return;
  if(!scoreboard || !teams){
    el.innerHTML = '<div class="text-gray-500 text-center">No scoreboard data</div>';
    return;
  }
  const tA = getTeam('a') || {name:'Team A',color:'#333'};
  const tB = getTeam('b') || {name:'Team B',color:'#333'};
  const names = [tA.name, tB.name];
  const colors = [tA.color||'#333', tB.color||'#333'];
  const longest = Math.max(names[0].length, names[1].length);
  let timeStr = scoreboard.time || '';
  if(scoreboard.timerRunning && scoreboard.timerStart){
    const elapsed = Math.floor((Date.now() - scoreboard.timerStart)/1000);
    const base = scoreboard.timerBase || parseTime(timeStr || '0:00');
    const down = (scoreboard.timeDirection || 'up') === 'down';
    const secs = down ? Math.max(0, base - elapsed) : base + elapsed;
    timeStr = formatTime(secs);
  }
  const info = [];
  if(timeStr) info.push(timeStr);
  if(scoreboard.period) info.push('P'+scoreboard.period);
  const brand = '#e16316';
  const textA = contrastColor(colors[0]);
  const textB = contrastColor(colors[1]);
  const textBrand = contrastColor(brand);
  el.innerHTML = `<div class='sb-container sb-style1 mx-auto' style='--sb-team-width:${longest}ch;'>`
    + `<div class='sb-row'>`
    + `<span class='sb-team' style='background:${colors[0]};color:${textA}'>${names[0]}</span>`
    + `<span class='sb-score' style='background:${brand};color:${textBrand}'>${scoreboard.scores?.[0]??0} | ${scoreboard.scores?.[1]??0}</span>`
    + `<span class='sb-team' style='background:${colors[1]};color:${textB}'>${names[1]}</span>`
    + `</div>`
    + (info.length?`<div class='sb-info'>${info.join(' | ')}</div>`:'')
    + `</div>`;
}

function renderLogs(){
  const cont = document.querySelector('#logs > div');
  if(!cont) return;
  if(!logs.length){
    cont.innerHTML = '<div class="text-gray-400">No logs</div>';
    return;
  }
  cont.innerHTML = `<ul class='space-y-1 text-sm'>${logs.map(e=>{ const teamName = e.team? (e.team==='a'?getTeam('a')?.name:getTeam('b')?.name):''; return `<li>${e.time||''} ${teamName?teamName+' ':''}${e.type||''}${e.player?` - ${e.player}`:''}</li>`; }).join('')}</ul>`;
}

async function init() {
  const user = await requireAuth(`sports.html?event_id=${eventId}`);
  const meta = await getEventMetadata(eventId) || { eventType: 'sports', sport: 'Football' };
  if (!meta.eventType) meta.eventType = 'sports';
  if (!meta.sport) meta.sport = 'Football';
  updateEventMetadata(eventId, { lastOpened: Date.now() }).catch(()=>{});

  const topBar = document.createElement('top-bar');
  if (user && user.email === 'ryanadmin') topBar.setAttribute('is-admin','true');
  topBar.setAttribute('event-name', meta.title || eventId);
  topBar.addEventListener('logout', logout);
  topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ eventId }); modal.classList.remove('hidden'); });
  document.getElementById('top-bar').appendChild(topBar);

  renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Sports Admin', firebaseStatus:'Connected to Firebase' }, { overlay:false, listener:false, sport:false, clock:true, atem:false, obs:false });

  const left = document.getElementById('left');
  const teamsTab = document.getElementById('teams');
  const statsTab = document.getElementById('stats');
  const sponsorsTab = document.getElementById('sponsors');
  const logsTab = document.getElementById('logs');

  const scoreboardPanel = document.createElement('div');
  left.appendChild(scoreboardPanel);
  const teamsPanel = document.createElement('div');
  teamsTab.appendChild(teamsPanel);
  const statsPanel = document.createElement('div');
  statsTab.appendChild(statsPanel);
  const sponsorsPanel = document.createElement('div');
  sponsorsTab.appendChild(sponsorsPanel);
  const logsPanel = document.createElement('div');
  logsTab.appendChild(logsPanel);

  function renderBySport(s){
    const label = getTeamLabel(s);
    const btn = document.querySelector('#right-tabs [data-tab="teams"]');
    if(btn) btn.textContent = label;
    if(s === 'Golf') {
      renderGolfPanel(scoreboardPanel, eventId);
      teamsTab.classList.add('hidden');
      renderStatsPanel(statsPanel, eventId);
      renderSponsorsPanel(sponsorsPanel, eventId);
    } else {
      renderScoreboardPanel(scoreboardPanel, s, eventId);
      renderTeamsPanel(teamsPanel, eventId, s);
      renderStatsPanel(statsPanel, eventId);
      renderSponsorsPanel(sponsorsPanel, eventId);
      teamsTab.classList.remove('hidden');
    }
  }

  renderBySport(meta.sport);

  onValue(ref(db, `teams/${eventId}`), snap=>{ teams = snap.val(); renderScoreboard(); renderLogs(); });
  listenOverlayState(eventId, state=>{ scoreboard = state && state.scoreboard; renderScoreboard(); });
  listenMatchLog(eventId, data=>{ logs = data || []; renderLogs(); });

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
