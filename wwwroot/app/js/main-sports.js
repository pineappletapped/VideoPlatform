import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderGolfPanel } from './components/golfPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { addMatchLog, getEventMetadata, updateEventMetadata, listenOverlayState, listenMatchLog, listenTeams, getUserFeatures, setTeams, setMatchLog, updateOverlayState } from './firebase.js';
import { getTeamLabel, sportsData } from './sportsConfig.js';
import { getDatabaseInstance } from './firebaseApp.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

const db = getDatabaseInstance();
let teams = null;
let teamsBaseId = eventId;
let scoreboard = null;
let logs = [];
let currentSport = 'Football';

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
  const tA = getTeam('a');
  const tB = getTeam('b');
  const aLogs = logs.filter(l=>l.team==='a');
  const bLogs = logs.filter(l=>l.team==='b');
  const listHtml = arr=>arr.map(e=>`<li>${e.time||''} ${e.type||''}${e.player?` - ${e.player}`:''}</li>`).join('');
  cont.innerHTML = `
    <div class='grid grid-cols-2 gap-4 text-sm'>
      <div><div class='font-bold mb-1'>${tA?.name||'Team A'}</div><ul class='space-y-1'>${listHtml(aLogs)}</ul></div>
      <div><div class='font-bold mb-1'>${tB?.name||'Team B'}</div><ul class='space-y-1'>${listHtml(bLogs)}</ul></div>
    </div>
    <div class='mt-2 text-right'><button id='sa-logs-edit' class='control-button btn-sm'>Edit</button></div>
    <div id='sa-logs-modal' class='modal-overlay' style='display:none;'>
      <div class='modal-window'>
        <h3 class='font-bold text-lg mb-2'>Edit Logs</h3>
        <textarea id='sa-logs-text' class='w-full h-48 p-2 border text-black'>${JSON.stringify(logs,null,2)}</textarea>
        <div class='mt-2 text-right'>
          <button id='sa-logs-save' class='control-button btn-sm'>Save</button>
          <button id='sa-logs-close' class='control-button btn-sm'>Close</button>
        </div>
      </div>
    </div>`;
  const editBtn = cont.querySelector('#sa-logs-edit');
  const modal = cont.querySelector('#sa-logs-modal');
  editBtn.onclick = ()=>{ modal.style.display='flex'; };
  cont.querySelector('#sa-logs-close').onclick = ()=>{ modal.style.display='none'; };
  cont.querySelector('#sa-logs-save').onclick = async ()=>{
    try{
      const arr = JSON.parse(cont.querySelector('#sa-logs-text').value);
      await setMatchLog(eventId, arr);
      modal.style.display='none';
    }catch(e){ alert('Invalid JSON'); }
  };
}

async function init() {
  const user = await requireAuth(`sports.html?event_id=${eventId}`);
  const features = await getUserFeatures(user.uid);
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
  const logsTab = document.getElementById('logs');

  const scoreboardPanel = document.createElement('div');
  left.appendChild(scoreboardPanel);
  const eventsPanel = document.createElement('div');
  left.appendChild(eventsPanel);
  const teamsPanel = document.createElement('div');
  teamsTab.appendChild(teamsPanel);
  const statsPanel = document.createElement('div');
  statsTab.appendChild(statsPanel);
  const logsPanel = document.createElement('div');
  logsTab.appendChild(logsPanel);

  function renderEventsPanel(){
    const logEvents = sportsData[currentSport]?.logEvents || ['Goal','Substitution'];
    if(!teams){ eventsPanel.innerHTML = '<div class="text-gray-500">Loading...</div>'; return; }
    eventsPanel.innerHTML = `
      <div class='bg-gray-800 text-gray-100 rounded-lg p-4'>
        <h2 class='font-bold text-lg mb-2'>In Game Events</h2>
        <div class='flex gap-2 items-center text-sm'>
          <select id='sa-ige-type' class='border p-1 flex-1 text-black'>${logEvents.map(e=>`<option value="${e}">${e}</option>`).join('')}</select>
          <select id='sa-ige-team' class='border p-1 text-black'>${['teamA','teamB'].map(k=>`<option value="${k}">${teams[k]?.name || k}</option>`).join('')}</select>
          <select id='sa-ige-player' class='border p-1 flex-1 text-black'></select>
          <select id='sa-ige-player-on' class='border p-1 flex-1 text-black' style='display:none;'></select>
          <button id='sa-ige-add' class='control-button btn-sm'>Add</button>
        </div>
      </div>`;
    const typeSel = eventsPanel.querySelector('#sa-ige-type');
    const teamSel = eventsPanel.querySelector('#sa-ige-team');
    const playerSel = eventsPanel.querySelector('#sa-ige-player');
    const playerOnSel = eventsPanel.querySelector('#sa-ige-player-on');
    const fillPlayers = () => {
      const teamKey = teamSel.value;
      const team = teams[teamKey];
      const starters = (team?.players || []).filter(p=>(p.status||'starting')==='starting').map(p=>p.name);
      const subs = (team?.players || []).filter(p=>p.status==='sub').map(p=>p.name);
      playerSel.innerHTML = ['<option value=""></option>', ...starters.map(p=>`<option value="${p}">${p}</option>`)].join('');
      playerOnSel.innerHTML = ['<option value=""></option>', ...subs.map(p=>`<option value="${p}">${p}</option>`)].join('');
    };
    const updateType = () => { playerOnSel.style.display = typeSel.value.toLowerCase() === 'substitution' ? '' : 'none'; };
    teamSel.onchange = fillPlayers;
    typeSel.onchange = updateType;
    fillPlayers();
    updateType();
    eventsPanel.querySelector('#sa-ige-add').onclick = async () => {
      const type = typeSel.value;
      const teamKey = teamSel.value;
      const off = playerSel.value;
      const on = playerOnSel.value;
      let playerField = '';
      let playerName = '';
      let playerNumber = '';
      if(type.toLowerCase() === 'substitution'){
        playerField = `${off} → ${on}`;
        playerName = off;
        const offObj = teams[teamKey]?.players.find(p=>p.name===off);
        playerNumber = offObj?.number || '';
        const teamObj = teams[teamKey];
        const offIdx = teamObj.players.findIndex(p=>p.name===off);
        const onIdx = teamObj.players.findIndex(p=>p.name===on);
        if(offIdx>=0) teamObj.players[offIdx].status='sub';
        if(onIdx>=0) teamObj.players[onIdx].status='starting';
        await setTeams(teamsBaseId, teams);
      } else {
        playerField = off;
        const plObj = teams[teamKey]?.players.find(p=>p.name===off);
        playerName = plObj?.name || off;
        playerNumber = plObj?.number || '';
      }
      const sb = scoreboard || {};
      let secs = parseTime(sb.time || '0:00');
      if(sb.timerRunning && sb.timerStart){
        const elapsed = Math.floor((Date.now()-sb.timerStart)/1000);
        secs = sb.timeDirection === 'down' ? Math.max(0,(sb.timerBase||0)-elapsed) : (sb.timerBase||0)+elapsed;
      }
      const timeStr = formatTime(secs);
      const logEntry = { ts: Date.now(), type, team: teamKey==='teamA'?'a':'b', player: playerField, playerName, playerNumber, time: timeStr };
      await addMatchLog(eventId, logEntry, true);
      fillPlayers();
    };
  }

  function renderBySport(s){
    currentSport = s;
    const label = getTeamLabel(s);
    const btn = document.querySelector('#right-tabs [data-tab="teams"]');
    if(btn) btn.textContent = label;
    if(s === 'Golf') {
      renderGolfPanel(scoreboardPanel, eventId);
      eventsPanel.classList.add('hidden');
      teamsTab.classList.add('hidden');
      renderStatsPanel(statsPanel, eventId, { showOverlayControls:false });
    } else {
      renderScoreboardPanel(scoreboardPanel, s, eventId, { showOverlayControls:false });
      eventsPanel.classList.remove('hidden');
      renderEventsPanel();
      renderTeamsPanel(teamsPanel, eventId, s);
      renderStatsPanel(statsPanel, eventId, { showOverlayControls:false });
      teamsTab.classList.remove('hidden');
    }
  }

  renderBySport(meta.sport);

  listenTeams(eventId, (data, baseId)=>{ teams = data; teamsBaseId = baseId; renderScoreboard(); renderEventsPanel(); renderLogs(); });
  listenOverlayState(eventId, state=>{ scoreboard = state && state.scoreboard; renderScoreboard(); });
  listenMatchLog(eventId, data=>{ logs = data || []; renderLogs(); });
  updateOverlayState(eventId,{ scoreboardVisible:true, scoreboardPreviewVisible:false });

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
