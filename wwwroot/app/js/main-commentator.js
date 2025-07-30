import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { getEventMetadata, listenOverlayState, listenMatchLog } from './firebase.js';
import { getDatabaseInstance } from './firebaseApp.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

const db = getDatabaseInstance();
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let teams = null;
let lineups = null;
let stats = [];
let logs = [];
let scoreboard = null;

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

function buildFormation(key){
    if(!teams || !lineups) return [];
    const lu = key==='a' ? lineups.teamA : lineups.teamB;
    if(!lu) return [];
    const team = getTeam(key);
    if(!team) return [];
    const nums = (lu.formation || '4-4-2').split('-').map(n=>parseInt(n.trim())).filter(n=>n>0);
    const players = lu.starters.map(i=>team.players[i]).filter(Boolean);
    const rows = [1,...nums];
    const step = 80/(rows.length-1);
    const startY = key==='a'?90:10;
    const res=[]; let idx=0;
    rows.forEach((count,r)=>{
        const y = key==='a'? startY - r*step : startY + r*step;
        for(let i=0;i<count;i++){
            const x = (i+1)/(count+1)*100;
            const pl = players[idx++] || {name:'',pos:'',photo:''};
            res.push({name:pl.name,pos:pl.pos,photo:pl.photo,x,y});
        }
    });
    return res;
}

function renderScoreboard(){
    const el = document.getElementById('scoreboard');
    if(!scoreboard || !teams){
        el.innerHTML = '<div class="text-gray-500">No scoreboard data</div>';
        return;
    }
    const tA = getTeam('a') || {name:'Team A',color:'#333'};
    const tB = getTeam('b') || {name:'Team B',color:'#333'};
    const names = [tA.name, tB.name];
    const colors = [tA.color || '#333', tB.color || '#333'];
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
    el.innerHTML = `<div class='sb-container sb-style1' style='--sb-team-width:${longest}ch;font-size:1.5rem;'>
        <div class='sb-row'>
            <span class='sb-team' style='background:${colors[0]};color:${textA}'>${names[0]}</span>
            <span class='sb-score' style='background:${brand};color:${textBrand}'>${scoreboard.scores?.[0]??0} | ${scoreboard.scores?.[1]??0}</span>
            <span class='sb-team' style='background:${colors[1]};color:${textB}'>${names[1]}</span>
        </div>
        ${info.length?`<div class='sb-info'>${info.join(' | ')}</div>`:''}
    </div>`;
}

function renderTeamColumn(key){
    let cont = document.getElementById('team-'+key);
    if(!cont){
        cont = document.createElement('div');
        cont.id = 'team-'+key;
        document.getElementById('teams').appendChild(cont);
    }
    if(!teams){ cont.innerHTML = '<div class="text-gray-500">Loading...</div>'; return; }
    const team = getTeam(key);
    if(!team){ cont.innerHTML=''; return; }
    const formation = buildFormation(key);
    const statsList = stats.filter(s=>s.team === (key==='a'?'teamA':'teamB'));
    const logList = logs.filter(l=>l.team === key);
    const playerHtml = (team.players||[]).map(p=>`<div class='flex items-center gap-2 mb-1'>${p.photo?`<img src='${p.photo}' class='w-8 h-8 object-cover rounded-full'>`:''}<span>${p.name}${p.pos?` <span class='text-xs text-gray-400'>${p.pos}</span>`:''}</span></div>`).join('');
    const showPhoto = teams.showPhotosFormation;
    const formHtml = formation.length ? `<div class='relative w-full' style='padding-top:60%;'>
            <div class='formation-pitch'></div>
            ${formation.map(pl=>`<div class='formation-player' style='top:${pl.y}%;left:${pl.x}%;'>${showPhoto && pl.photo?`<img src='${pl.photo}' class='formation-photo'>`:''}<span>${pl.name}</span></div>`).join('')}
        </div>` : '<div class="text-gray-400">No formation</div>';
    const statsHtml = statsList.length ? `<ul class='list-disc list-inside text-sm space-y-1'>${statsList.map(s=>`<li>${s.fact}${s.player?` - ${s.player}`:''}</li>`).join('')}</ul>` : '<div class="text-gray-400">No stats</div>';
    const logHtml = logList.length ? `<ul class='text-sm space-y-1'>${logList.map(e=>`<li>${e.time||''} ${e.type||''} ${e.player||''}</li>`).join('')}</ul>` : '<div class="text-gray-400">No log</div>';
    cont.innerHTML = `<div class='space-y-2'>
        <h2 class='font-bold text-lg text-center mb-2'>${team.name}</h2>
        <div class='tabs flex gap-2 justify-center text-sm'>
            <button class='tab-btn border-b-2 border-brand' data-tab='players-${key}'>Players</button>
            <button class='tab-btn' data-tab='formation-${key}'>Formation</button>
            <button class='tab-btn' data-tab='stats-${key}'>Stats</button>
            <button class='tab-btn' data-tab='log-${key}'>Log</button>
        </div>
        <div id='players-${key}' class='tab-content'>${playerHtml}</div>
        <div id='formation-${key}' class='tab-content hidden'>${formHtml}</div>
        <div id='stats-${key}' class='tab-content hidden'>${statsHtml}</div>
        <div id='log-${key}' class='tab-content hidden'>${logHtml}</div>
    </div>`;
    cont.querySelectorAll('.tab-btn').forEach(btn=>{
        btn.addEventListener('click',()=>{
            const target = btn.getAttribute('data-tab');
            cont.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('border-brand'));
            btn.classList.add('border-brand');
            cont.querySelectorAll('.tab-content').forEach(c=>c.classList.add('hidden'));
            cont.querySelector('#'+target).classList.remove('hidden');
        });
    });
}

function renderAll(){
    renderTeamColumn('a');
    renderTeamColumn('b');
}

async function init(user){
    const ev = await getEventMetadata(eventId) || {};
    const tb = document.createElement('top-bar');
    tb.setAttribute('event-name', ev.title || eventId);
    tb.addEventListener('logout', logout);
    document.getElementById('top-bar').appendChild(tb);
    renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Commentator', firebaseStatus:'Connected' }, { overlay:false, listener:false, sport:true, clock:true, atem:false, obs:false });

    onValue(ref(db, `teams/${eventId}`), snap => { teams = snap.val(); renderAll(); });
    onValue(ref(db, `lineups/${eventId}`), snap => { lineups = snap.val(); renderAll(); });
    onValue(ref(db, `stats/${eventId}`), snap => { stats = snap.val() || []; renderAll(); });
    listenMatchLog(eventId, data => { logs = data || []; renderAll(); });
    listenOverlayState(eventId, state => { scoreboard = state && state.scoreboard; renderScoreboard(); });
}

requireAuth(`commentator.html?event_id=${eventId}`).then(u=>init(u));
