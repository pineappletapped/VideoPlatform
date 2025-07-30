import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderLineupPanel } from './components/lineupPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { listenMatchLog, listenOverlayState, getEventMetadata } from './firebase.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

async function init(user){
    const ev = await getEventMetadata(eventId) || {};
    const tb = document.createElement('top-bar');
    tb.setAttribute('event-name', ev.title || eventId);
    tb.addEventListener('logout', logout);
    document.getElementById('top-bar').appendChild(tb);
    renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Commentator', firebaseStatus:'Connected' }, { overlay:false, listener:false, sport:true, clock:true, atem:false, obs:false });

    renderLineupPanel(document.getElementById('lineups'), eventId, ev.sport || 'Football', 'view');
    renderStatsPanel(document.getElementById('stats'), eventId, 'view');

    listenMatchLog(eventId, entries=>{
        const list = document.getElementById('logs');
        list.innerHTML = entries.map(e=>`<li>${e.time||''} ${e.type||''} ${e.player||''}</li>`).join('');
    });

    listenOverlayState(eventId, state=>{
        const sb = state && state.scoreboard;
        const el = document.getElementById('scoreboard');
        if(sb){
            const a = sb.scores?.[0] ?? 0;
            const b = sb.scores?.[1] ?? 0;
            const time = sb.time || '';
            el.innerHTML = `<div class='font-bold mb-1'>${a} - ${b}</div><div class='text-sm'>${time}</div>`;
        } else {
            el.innerHTML = '<div class="text-gray-500">No scoreboard data</div>';
        }
    });
}

requireAuth(`commentator.html?event_id=${eventId}`).then(u=>init(u));
