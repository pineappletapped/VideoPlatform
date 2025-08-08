import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { updateOverlayState, listenOverlayState, addMatchLog, listenFavorites, updateFavorites, resolveAssetPath, listenTeams } from "../firebase.js";
import { suggestAbbreviation } from "../teamUtils.js";

const DEFAULT_STYLES = [
    // Football / Soccer
    { id: 'football-pulse', label: 'Pitch Pulse' },
    { id: 'football-terrace', label: 'Modern Terrace' },
    { id: 'football-neon', label: 'Stadium Neon' },
    // Basketball
    { id: 'basketball-catalyst', label: 'Court Catalyst' },
    { id: 'basketball-slick', label: 'Skyline Slick' },
    { id: 'basketball-retro', label: 'Hardwood Retro' },
    // Netball
    { id: 'netball-hoop', label: 'Hoop Highlight' },
    { id: 'netball-chalk', label: 'Chalkboard Court' },
    { id: 'netball-classic', label: 'Classic Netball' },
    // Golf
    { id: 'golf-links', label: 'Links Classic' },
    { id: 'golf-green', label: 'Augusta Green' },
    { id: 'golf-classic', label: 'Clubhouse Classic' },
    // Baseball
    { id: 'baseball-diamond', label: 'Diamond Plate' },
    { id: 'baseball-dugout', label: 'Dugout Chalk' },
    { id: 'baseball-classic', label: 'Ballpark Classic' },
    // American Football
    { id: 'af-bold', label: 'Grid Iron Bold' },
    { id: 'af-stripes', label: 'Energy Stripes' },
    { id: 'af-horizon', label: 'Field Horizon' },
    // Tennis
    { id: 'ten-baseline', label: 'Baseline Burst' },
    { id: 'ten-chic', label: 'Grand Slam Chic' },
    { id: 'ten-digital', label: 'Court Digital' },
    // Existing generic styles
    { id: 'football', label: 'Football Row' },
    { id: 'style1', label: 'Classic' },
    { id: 'style2', label: 'Dark Box' },
    { id: 'style3', label: 'Outline' },
    { id: 'style4', label: 'Light' },
    { id: 'style5', label: 'Solid' },
    { id: 'h1', label: 'Horizontal 1' },
    { id: 'h2', label: 'Horizontal 2' },
    { id: 'cricket', label: 'Cricket' },
    { id: 'tennis', label: 'Tennis' }
];

function getStylesForSport(sport){
    const ids = sportsData[sport]?.scoreboardStyles;
    if(!ids) return DEFAULT_STYLES;
    return ids.map(id=>DEFAULT_STYLES.find(s=>s.id===id) || {id,label:id});
}
const scoreboardPositions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-center', label: 'Bottom Center' }
];

const transitions = [
    { value: 'cut', label: 'Cut' },
    { value: 'fade', label: 'Fade' },
    { value: 'slide-left', label: 'Slide Left' },
    { value: 'slide-right', label: 'Slide Right' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'slide-down', label: 'Slide Down' }
];


function contrastColor(hex) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#000' : '#fff';
}

function getCheckout(score) {
    if (score < 2 || score > 170) return null;
    const singles = Array.from({length:20},(_,i)=>({label:(i+1).toString(),value:i+1}));
    const doubles = singles.map(s=>({label:'D'+s.label,value:s.value*2}));
    const trebles = singles.map(s=>({label:'T'+s.label,value:s.value*3}));
    const singlesAll = [...singles.map(s=>({label:'S'+s.label,value:s.value})),{label:'SB',value:25}];
    const all = [...trebles.sort((a,b)=>b.value-a.value),...doubles.sort((a,b)=>b.value-a.value),...singlesAll.sort((a,b)=>b.value-a.value)];
    const lastSeg = [...doubles,{label:'DB',value:50}];
    // 1 dart checkout
    for (const l of lastSeg) if (l.value===score) return l.label;
    // 2 dart checkout
    for (const a of all){
        for (const l of lastSeg){
            if (a.value+l.value===score) return `${a.label} + ${l.label}`;
        }
    }
    // 3 dart checkout
    for (const a of all){
        for (const b of all){
            for (const l of lastSeg){
                if (a.value+b.value+l.value===score) return `${a.label} + ${b.label} + ${l.label}`;
            }
        }
    }
    return null;
}

const db = getDatabaseInstance();

function getScoreboardRef(eventId) {
    return ref(db, `scoreboard/${eventId}`);
}

export function renderScoreboardPanel(container, sport = 'Football', eventId = 'demo', options = {}) {
    const cfg = sportsData[sport] || sportsData['Football'];
    const scoreboardStyles = getStylesForSport(sport);
    const showOverlayControls = options.showOverlayControls !== false;
    const goalSport = (sportsData[sport]?.logEvents || []).some(e => e.toLowerCase() === 'goal');

    let teamsData = null;

    function getTeam(idx){
        if(!teamsData) return { name:`Team ${idx+1}`, color:'#ffffff', players:[] };
        if(teamsData.teams){
            const sel = idx===0 ? (teamsData.currentA||0) : (teamsData.currentB||1);
            return teamsData.teams[sel] || { name:`Team ${idx+1}`, color:'#ffffff', players:[] };
        }
        return idx===0 ? (teamsData.teamA || {name:`Team ${idx+1}`, color:'#ffffff', players:[]} )
                        : (teamsData.teamB || {name:`Team ${idx+1}`, color:'#ffffff', players:[]});
    }
    let currentData = null;
    let timerInterval = null;
    let favorites = { scoreboard: false, stingers: [], shortcuts: {}, sponsors: [] };

    listenTeams(eventId, data => { teamsData = data; if(currentData) render(currentData); });

    let sbVisible = false;
    let sbPreview = false;
    let breakVisible = false;
    let highBreakVisible = false;
    let shootoutVisible = false;
    let shootoutPreview = false;

    listenOverlayState(eventId, state => {
        sbVisible = (state && state.scoreboardVisible) || false;
        sbPreview = (state && state.scoreboardPreviewVisible) || false;
        breakVisible = (state && state.breakVisible) || false;
        highBreakVisible = (state && state.highBreakVisible) || false;
        shootoutVisible = (state && state.shootoutVisible) || false;
        shootoutPreview = (state && state.shootoutPreviewVisible) || false;
        if (currentData) render(currentData);
    });
    listenFavorites(eventId, fav => { favorites = { scoreboard: false, stingers: [], shortcuts: {}, sponsors: [], ...(fav || {}) }; if(currentData) render(currentData); });

    onValue(getScoreboardRef(eventId), snap => {
        currentData = snap.val() || defaultData();
        render(currentData);
        updateOverlayState(eventId, { scoreboard: currentData });
    });

    function defaultData() {
        const startVal = cfg.scoreboard.start || 0;
        const scores = Array.from({ length: cfg.teamCount }).map(() => startVal);
        const base = { scores, style: 'style1', position: 'bottom-center', transitionIn: 'fade', transitionOut: 'fade', abbreviate: false, showLogos: true, start: startVal };
        if (cfg.scoreboard.periods) base.period = 1;
        if (cfg.scoreboard.time) {
            base.time = '00:00';
            base.timerStart = null;
            base.timerBase = 0;
            base.timerRunning = false;
            base.timeDirection = cfg.scoreboard.timeDirection || 'up';
        }
        if (cfg.scoreboard.round) base.round = 1;
        if (cfg.scoreboard.sets) base.sets = scores.map(() => 0);
        if (cfg.scoreboard.games) base.games = scores.map(() => 0);
        if (cfg.scoreboard.frames) base.frames = scores.map(() => 0);
        if (sport === 'Snooker') {
            base.frameFormat = 'firstTo';
            base.frameTarget = 1;
        }
        if (cfg.scoreboard.legs) base.legs = scores.map(() => 0);
        if (cfg.scoreboard.points) base.points = scores.map(() => 0);
        if (cfg.scoreboard.overs) base.overs = scores.map(() => 0);
        if (cfg.scoreboard.balls) base.balls = scores.map(() => 0);
        if (cfg.scoreboard.wickets) base.wickets = scores.map(() => 0);
        if (cfg.scoreboard.runRate) base.runRate = 0;
        if (cfg.scoreboard.requiredRate) base.requiredRate = 0;
        if (cfg.scoreboard.target) base.target = 0;
        if (cfg.scoreboard.pitchCount) base.pitchCount = { balls: 0, strikes: 0 };
        if (cfg.scoreboard.outs) base.outs = 0;
        if (cfg.scoreboard.bases) base.bases = [false, false, false];
        if (cfg.scoreboard.breaks) base.currentBreak = 0;
        if (cfg.scoreboard.highBreak) base.highBreak = 0;
        if (cfg.scoreboard.turn) base.turn = 0;
        if (sport === 'Darts') {
            base.dartStats = scores.map(() => ({ throws: 0, highCheckout: 0, count180: 0, count140: 0, count100: 0 }));
            base.dartLogs = scores.map(() => []);
        }
        base.extraTime = false;
        base.shootout = { shots: scores.map(() => Array.from({length:5}, () => ({ player: '', result: '' }))) };
        return base;
    }

    function render(data) {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        if(!data.shootout){
            data.shootout = { shots: (data.scores||[]).map(()=>Array.from({length:5}, () => ({ player:'', result:'' })) ) };
        }
        const controlHtml = showOverlayControls ? `
                    <button id="sb-preview" class="control-button btn-sm btn-preview${sbPreview ? ' ring-2 ring-brand' : ''}">Preview</button>
                    <button id="sb-live" class="control-button btn-sm btn-live${sbVisible ? ' ring-2 ring-green-400' : ''}">Live</button>
                    ${cfg.scoreboard.breaks ? `<button id="sb-show-break" class="control-button btn-sm${breakVisible ? ' ring-2 ring-green-400' : ''}">Show Break</button>` : ''}
                    ${cfg.scoreboard.highBreak ? `<button id="sb-show-high" class="control-button btn-sm${highBreakVisible ? ' ring-2 ring-green-400' : ''}">Show High Break</button>` : ''}
                    <button id="sb-save" class="control-button btn-sm ml-auto">Save</button>
                    <button id="sb-edit" class="control-button btn-sm">Edit</button>
                    <button id="sb-fav" class="control-button btn-sm">${favorites.scoreboard ? '★' : '☆'}</button>`
                : `
                    <button id="sb-save" class="control-button btn-sm ml-auto">Save</button>
                    <button id="sb-edit" class="control-button btn-sm">Edit</button>`;
        container.innerHTML = `
            <div class='scoreboard-panel'>
                <h2 class="font-bold text-lg mb-2">${sport} Scoreboard</h2>
                <div class="mb-2 flex gap-2">
                    ${controlHtml}
                </div>
                <table id="sb-table" class="w-full text-sm"></table>
                <div id="sb-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Scoreboard Options</h3>
                        <div class="mb-2">
                            <label class="block text-sm">Style</label>
                            <select id="sb-style" class="border p-1 w-full">
                                ${scoreboardStyles.map(s=>`<option value="${s.id}">${s.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Position</label>
                            <select id="sb-position" class="border p-1 w-full">
                                ${scoreboardPositions.map(p=>`<option value="${p.value}">${p.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Transition In</label>
                            <select id="sb-trans-in" class="border p-1 w-full">
                                ${transitions.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Transition Out</label>
                            <select id="sb-trans-out" class="border p-1 w-full">
                                ${transitions.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="inline-flex items-center text-sm"><input type="checkbox" id="sb-abbrev" class="mr-1">Abbreviate names</label>
                        </div>
                        <div class="mb-2">
                            <label class="inline-flex items-center text-sm"><input type="checkbox" id="sb-show-logos" class="mr-1" checked>Show logos</label>
                        </div>
                        <div id="sb-prev" class="mt-2 flex justify-center"></div>
                        <div class="flex gap-2 mt-4">
                            <button id="sb-modal-save" class="control-button btn-sm">Save</button>
                            <button id="sb-modal-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>`;
        const parseTime = str => { const [m = '0', s = '0'] = str.split(':'); return parseInt(m) * 60 + parseInt(s); };
        const formatTime = secs => `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
        const currentTimeStr = () => {
            const sb = getFormData();
            let secs = parseTime(sb.time || '0:00');
            if(sb.timerRunning && sb.timerStart){
                const elapsed = Math.floor((Date.now()-sb.timerStart)/1000);
                secs = (sb.timeDirection==='down') ? Math.max(0,(sb.timerBase||0) - elapsed) : (sb.timerBase||0) + elapsed;
            }
            return formatTime(secs);
        };
        async function promptGoal(teamIndex){
            return new Promise(res=>{
                const teamKey = teamIndex===0?'teamA':'teamB';
                const players = (teamsData?.[teamKey]?.players||[]).filter(p=>(p.status||'starting')==='starting');
                const opts = players.map(p=>`<option value="${p.name}">${p.name}</option>`).join('');
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.innerHTML = `
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Goal Details</h3>
                        <div class="mb-2"><label class="block text-sm">Scorer</label><select id="goal-scorer" class="border p-1 w-full"><option value=""></option>${opts}</select></div>
                        <div class="mb-2"><label class="block text-sm">Assist</label><select id="goal-assist" class="border p-1 w-full"><option value=""></option>${opts}</select></div>
                        <div class="flex gap-2 mt-4"><button id="goal-ok" class="control-button btn-sm">Save</button><button id="goal-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button></div>
                    </div>`;
                container.appendChild(modal);
                modal.querySelector('#goal-cancel').onclick = () => { modal.remove(); res(null); };
                modal.querySelector('#goal-ok').onclick = () => {
                    const scorer = modal.querySelector('#goal-scorer').value;
                    const assist = modal.querySelector('#goal-assist').value;
                    modal.remove();
                    res({scorer,assist});
                };
            });
        }
        const table = container.querySelector('#sb-table');
        const htmlParts = [];
        const tennisPoints = ['0','15','30','40','Ad'];
        (data.scores || []).forEach((sc, i) => {
            const t = getTeam(i);
            const name = t.name || `Team ${i + 1}`;
            const color = t.color || '#ffffff';
            const textCol = contrastColor(color);
            const activeClass = cfg.scoreboard.turn && data.turn === i ? ' class="active-player"' : '';
            const checkout = sport === 'Darts' ? getCheckout(sc) : null;
            const checkoutHtml = checkout ? `<span id="checkout-${i}" class="text-xs ml-2">${checkout}</span><button id="checkout-btn-${i}" class="control-button btn-xs ml-1">Show</button>` : '';
            if (sport === 'Tennis') {
                const opts = tennisPoints.map((p,idx)=>`<option value="${idx}"${sc===idx?' selected':''}>${p}</option>`).join('');
                htmlParts.push(`<tr${activeClass}><td class="pr-2 whitespace-nowrap" style="background:${color};color:${textCol};min-width:6rem;text-align:center;">${name}</td><td><div class="flex items-center"><select id="team-score-${i}" class="border p-1 text-center">${opts}</select><span id="score-btns-${i}" class="ml-1"></span>${checkoutHtml}</div></td></tr>`);
            } else {
                htmlParts.push(`<tr${activeClass}><td class="pr-2 whitespace-nowrap" style="background:${color};color:${textCol};min-width:6rem;text-align:center;">${name}</td><td><div class="flex items-center"><input type="number" id="team-score-${i}" class="border p-1 w-16 text-center" value="${sc}"><span id="score-btns-${i}" class="ml-1"></span>${checkoutHtml}</div></td></tr>`);
            }
        });
        if (cfg.scoreboard.periods) {
            htmlParts.push(`<tr><td class="pr-2">${cfg.scoreboard.periodLabel || 'Period'}:</td><td><input type="number" class="border p-1 w-16" id="sb-period" value="${data.period || 1}"></td></tr>`);
        }
        if (cfg.scoreboard.time) {
            const dir = cfg.scoreboard.timeDirection === 'down' ? 'down' : 'up';
            htmlParts.push(`<tr><td class="pr-2">Time (${dir}):</td><td><div class="flex items-center gap-1"><input type="text" class="border p-1 w-20" id="sb-time" value="${data.time || '00:00'}" placeholder="mm:ss"><button id="sb-start" class="control-button btn-xs">Start</button><button id="sb-stop" class="control-button btn-xs">Stop</button><button id="sb-reset" class="control-button btn-xs">Reset</button></div></td></tr>`);
            htmlParts.push(`<tr><td class="pr-2">Stoppage:</td><td><div class="flex items-center gap-1"><input type="number" class="border p-1 w-12" id="sb-stoppage" value="${data.stoppage || 0}"><button id="sb-add-st" class="control-button btn-xs">+1</button><button id="sb-toggle-st" class="control-button btn-xs${data.showStoppage?' ring-2 ring-green-400':''}">Toggle</button></div></td></tr>`);
        }
        if(goalSport){
            htmlParts.push(`<tr><td class="pr-2">Extra Time:</td><td><button id="sb-toggle-et" class="control-button btn-xs${data.extraTime?' ring-2 ring-green-400':''}">Toggle</button></td></tr>`);
            htmlParts.push(`<tr><td class="pr-2">Shoot-out:</td><td><button id="sb-view-shootout" class="control-button btn-xs">View Controls</button></td></tr>`);
            htmlParts.push(`<tr id="sb-shootout-row" style="display:none;"><td colspan="2"><div id="sb-shootout-controls"></div></td></tr>`);
        }
        if (cfg.scoreboard.round) {
            htmlParts.push(`<tr><td class="pr-2">Round:</td><td><input type="number" class="border p-1 w-16" id="sb-round" value="${data.round || 1}"></td></tr>`);
        }
        const count = (data.scores || []).length;
        if (cfg.scoreboard.sets) {
            htmlParts.push(`<tr><td class="pr-2">Sets:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-set-${i}" value="${(data.sets && data.sets[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.games) {
            htmlParts.push(`<tr><td class="pr-2">Games:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-game-${i}" value="${(data.games && data.games[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.frames) {
            htmlParts.push(`<tr><td class="pr-2">Frames:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-frame-${i}" value="${(data.frames && data.frames[i]) || 0}">`).join('')}</td></tr>`);
            if (sport === 'Snooker') {
                const target = data.frameTarget || 0;
                htmlParts.push(`<tr><td class="pr-2">Frame Target:</td><td><div class="flex items-center gap-2"><select id="sb-frame-format" class="border p-1"><option value="firstTo">First to</option><option value="bestOf">Best of</option></select><input type="number" class="border p-1 w-16" id="sb-frame-target" value="${target}"></div></td></tr>`);
            }
        }
        if (cfg.scoreboard.legs) {
            htmlParts.push(`<tr><td class="pr-2">Legs:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-leg-${i}" value="${(data.legs && data.legs[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.points) {
            htmlParts.push(`<tr><td class="pr-2">Points:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-point-${i}" value="${(data.points && data.points[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.overs) {
            htmlParts.push(`<tr><td class="pr-2">Overs:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-over-${i}" value="${(data.overs && data.overs[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.balls) {
            htmlParts.push(`<tr><td class="pr-2">Balls:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-ball-${i}" value="${(data.balls && data.balls[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.wickets) {
            htmlParts.push(`<tr><td class="pr-2">Wkts:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-wkt-${i}" value="${(data.wickets && data.wickets[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.runRate) {
            htmlParts.push(`<tr><td class="pr-2">Run Rate:</td><td><input type="number" step="0.01" class="border p-1 w-16" id="sb-runrate" value="${data.runRate || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.requiredRate) {
            htmlParts.push(`<tr><td class="pr-2">Req Rate:</td><td><input type="number" step="0.01" class="border p-1 w-16" id="sb-reqrate" value="${data.requiredRate || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.target) {
            htmlParts.push(`<tr><td class="pr-2">Target:</td><td><input type="number" class="border p-1 w-16" id="sb-target" value="${data.target || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.pitchCount) {
            const pc = data.pitchCount || { balls: 0, strikes: 0 };
            htmlParts.push(`<tr><td class="pr-2">Count:</td><td><input type="number" class="border p-1 w-12 mx-1" id="sb-balls" value="${pc.balls}">B <input type="number" class="border p-1 w-12 mx-1" id="sb-strikes" value="${pc.strikes}">S</td></tr>`);
        }
        if (cfg.scoreboard.outs) {
            htmlParts.push(`<tr><td class="pr-2">Outs:</td><td><input type="number" class="border p-1 w-12 mx-1" id="sb-outs" value="${data.outs || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.bases) {
            const bases = data.bases || [false,false,false];
            htmlParts.push(`<tr><td class="pr-2">Bases:</td><td>${[1,2,3].map(i=>`<label class='mx-1'><input type='checkbox' id='sb-base${i}'${bases[i-1] ? ' checked' : ''}>${i}</label>`).join('')}</td></tr>`);
        }
        const tnA = getTeam(0).name || 'Team 1';
        const tnB = getTeam(1).name || 'Team 2';
        if (sport === 'Darts') {
            htmlParts.push(`<tr><td class="pr-2">Dart:</td><td><input type="number" class="border p-1 w-16" id="dart-val"><button id="dart-a" class="control-button btn-xs ml-1">${tnA}</button><button id="dart-b" class="control-button btn-xs ml-1">${tnB}</button><button id="new-leg" class="control-button btn-xs ml-1">New Leg</button></td></tr>`);
            htmlParts.push(`<tr><td colspan="2"><div id="dart-stats" class="text-xs"></div></td></tr>`);
        }
        if (cfg.scoreboard.breaks) {
            htmlParts.push(`<tr><td class="pr-2">Current Break:</td><td><input type="number" class="border p-1 w-16" id="sb-break" value="${data.currentBreak || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.highBreak) {
            htmlParts.push(`<tr><td class="pr-2">High Break:</td><td><input type="number" class="border p-1 w-16" id="sb-highbreak" value="${data.highBreak || 0}" disabled></td></tr>`);
        }
        if (cfg.scoreboard.turn) {
            const optA = getTeam(0).name || 'Team 1';
            const optB = getTeam(1).name || 'Team 2';
            const turnLabel = sport === 'Tennis' ? 'Serve' : 'In Play';
            htmlParts.push(`<tr><td class="pr-2">${turnLabel}:</td><td><select id="sb-turn" class="border p-1"><option value="0">${optA}</option><option value="1">${optB}</option></select></td></tr>`);
        }
        table.innerHTML = htmlParts.join('');

        function renderShootoutControls(){
            const holder = container.querySelector('#sb-shootout-controls');
            if(!holder) return;
            const shots = data.shootout?.shots || [[],[]];
            const players = [getTeam(0).players||[], getTeam(1).players||[]];
            const teamHtml = t => (shots[t] || []).map((s,i)=>`<div class="flex items-center mb-1"><select id="shot-player-${t}-${i}" class="border p-1 mr-1 text-black"><option value=""></option>${players[t].map(p=>`<option value="${p.name}"${s.player===p.name?' selected':''}>${p.name}</option>`).join('')}</select><select id="shot-res-${t}-${i}" class="border p-1 text-black"><option value=""></option><option value="goal"${s.result==='goal'?' selected':''}>Scored</option><option value="miss"${s.result==='miss'?' selected':''}>Missed</option></select></div>`).join('');
            holder.innerHTML = `
                ${showOverlayControls?`<div class="mb-2 flex gap-2">
                    <button id="shootout-preview" class="control-button btn-sm btn-preview${shootoutPreview ? ' ring-2 ring-brand' : ''}">Preview</button>
                    <button id="shootout-live" class="control-button btn-sm btn-live${shootoutVisible ? ' ring-2 ring-green-400' : ''}">Live</button>
                </div>`:''}
                <div class="grid grid-cols-2 gap-4 text-xs">
                    <div><div class="font-bold mb-1">${tnA}</div>${teamHtml(0)}</div>
                    <div><div class="font-bold mb-1">${tnB}</div>${teamHtml(1)}</div>
                </div>`;
            if(showOverlayControls){
                holder.querySelector('#shootout-preview').onclick = async () => {
                    const obj = getFormData();
                    await saveData(obj);
                    const show = !shootoutPreview;
                    await updateOverlayState(eventId,{ shootoutPreviewVisible: show });
                };
                holder.querySelector('#shootout-live').onclick = async () => {
                    const obj = getFormData();
                    await saveData(obj);
                    const show = !shootoutVisible;
                    await updateOverlayState(eventId,{ shootoutVisible: show, shootoutPreviewVisible: false });
                };
            }
        }

        const viewBtn = container.querySelector('#sb-view-shootout');
        const shootRow = container.querySelector('#sb-shootout-row');
        if(viewBtn && shootRow){
            viewBtn.onclick = () => {
                const vis = shootRow.style.display !== 'none';
                shootRow.style.display = vis ? 'none' : '';
                if(!vis) renderShootoutControls();
            };
        }

        const ffSel = container.querySelector('#sb-frame-format');
        if (ffSel) ffSel.value = data.frameFormat || 'firstTo';
        updateDartStats();
        (data.scores || []).forEach((_, i) => {
            const input = container.querySelector(`#team-score-${i}`);
            if (input) {
                input.addEventListener('input', () => {
                    const val = parseInt(input.value) || 0;
                    data.scores[i] = val;
                    const cSpan = container.querySelector(`#checkout-${i}`);
                    if (cSpan) cSpan.textContent = getCheckout(val) || '';
                });
            }
            const holder = container.querySelector(`#score-btns-${i}`);
            if (holder && cfg.scoringButtons) {
                cfg.scoringButtons.forEach(btnCfg => {
                    const btn = document.createElement('button');
                    btn.textContent = btnCfg.label;
                    btn.className = 'score-btn btn-xs';
                    btn.style.background = btnCfg.color || '#666';
                    if (btnCfg.textColor) btn.style.color = btnCfg.textColor;
                    btn.addEventListener('click', async () => {
                        if (sport === 'Tennis') {
                            const other = i === 0 ? 1 : 0;
                            const otherInput = container.querySelector(`#team-score-${other}`);
                            let val = parseInt(input.value) || 0;
                            let otherVal = parseInt(otherInput?.value) || 0;
                            if (val <= 2) {
                                val += 1;
                            } else if (val === 3) {
                                if (otherVal === 4) {
                                    val = 3; otherVal = 3;
                                } else if (otherVal === 3) {
                                    val = 4;
                                } else {
                                    val = 0; otherVal = 0;
                                    const gInput = container.querySelector(`#sb-game-${i}`);
                                    if (gInput) { gInput.value = (parseInt(gInput.value) || 0) + 1; data.games[i] = parseInt(gInput.value) || 0; }
                                }
                            } else if (val === 4) {
                                val = 0; otherVal = 0;
                                const gInput = container.querySelector(`#sb-game-${i}`);
                                if (gInput) { gInput.value = (parseInt(gInput.value) || 0) + 1; data.games[i] = parseInt(gInput.value) || 0; }
                            }
                            input.value = val;
                            data.scores[i] = val;
                            if (otherInput) { otherInput.value = otherVal; data.scores[other] = otherVal; }
                            await saveData(getFormData());
                        } else {
                            const val = parseInt(input.value) || 0;
                            const newVal = val + btnCfg.value;
                            input.value = newVal;
                            data.scores[i] = newVal;
                            const cSpan = container.querySelector(`#checkout-${i}`);
                            if (cSpan) cSpan.textContent = getCheckout(newVal) || '';
                            if (cfg.scoreboard.breaks && data.turn === i) {
                                const br = container.querySelector('#sb-break');
                                const hb = container.querySelector('#sb-highbreak');
                                if (br) {
                                    br.value = (parseInt(br.value) || 0) + btnCfg.value;
                                    if (hb && parseInt(br.value) > (parseInt(hb.value) || 0)) hb.value = br.value;
                                }
                            }
                            if(goalSport && btnCfg.value === 1){
                                const res = await promptGoal(i);
                                if(res){
                                    const teamKey = i===0?'a':'b';
                                    const teamPlayers = getTeam(i).players || [];
                                    const scObj = teamPlayers.find(p=>p.name===res.scorer);
                                    const asObj = teamPlayers.find(p=>p.name===res.assist);
                                    await addMatchLog(eventId,{ts:Date.now(),type:'Goal',team:teamKey,player:res.scorer,playerName:res.scorer,playerNumber:scObj?.number||'',assist:res.assist,assistNumber:asObj?.number||'',time:currentTimeStr()});
                                    await saveData(getFormData());
                                }else{
                                    input.value = val;
                                    data.scores[i] = val;
                                    if (cSpan) cSpan.textContent = getCheckout(val) || '';
                                }
                            }else{
                                await saveData(getFormData());
                            }
                        }
                    });
                    holder.appendChild(btn);
                });
            }
            const cBtn = container.querySelector(`#checkout-btn-${i}`);
            if (cBtn) {
                cBtn.addEventListener('click', async () => {
                    const val = parseInt(input.value) || 0;
                    const checkout = getCheckout(val);
                    if (checkout) {
                        data.checkoutPlayer = i;
                        data.checkoutText = checkout;
                        const obj = getFormData();
                        await updateOverlayState(eventId, { scoreboard: obj, scoreboardVisible: true });
                    }
                });
            }
        });

        const timeInput = container.querySelector('#sb-time');
        const startBtn = container.querySelector('#sb-start');
        const stopBtn = container.querySelector('#sb-stop');
        const resetBtn = container.querySelector('#sb-reset');
        const countDown = cfg.scoreboard.timeDirection === 'down';
        let baseSecs = timeInput ? parseTime(timeInput.value) : 0;
        let timerSecs = baseSecs;
        let startTime = null;
        if(data.timerRunning && data.timerStart){
            const elapsed = Math.floor((Date.now()-data.timerStart)/1000);
            timerSecs = countDown ? Math.max(0,data.timerBase - elapsed) : data.timerBase + elapsed;
            timeInput.value = formatTime(timerSecs);
            baseSecs = data.timerBase;
            startTime = Date.now() - elapsed*1000;
            timerInterval = setInterval(()=>{
                const e = Math.floor((Date.now()-startTime)/1000);
                timerSecs = countDown ? Math.max(0,baseSecs - e) : baseSecs + e;
                timeInput.value = formatTime(timerSecs);
            },1000);
        }
        if (startBtn && timeInput) {
            startBtn.onclick = async () => {
                if (timerInterval) return;
                baseSecs = parseTime(timeInput.value);
                timerSecs = baseSecs;
                startTime = Date.now();
                data.timerStart = startTime;
                data.timerBase = baseSecs;
                data.timerRunning = true;
                await saveData(getFormData());
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime)/1000);
                    timerSecs = countDown ? Math.max(0, baseSecs - elapsed) : baseSecs + elapsed;
                    timeInput.value = formatTime(timerSecs);
                }, 1000);
            };
        }
        if (stopBtn) {
            stopBtn.onclick = async () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
                const elapsed = startTime ? Math.floor((Date.now() - startTime)/1000) : 0;
                timerSecs = countDown ? Math.max(0, baseSecs - elapsed) : baseSecs + elapsed;
                timeInput.value = formatTime(timerSecs);
                data.timerRunning = false;
                data.timerStart = null;
                data.timerBase = timerSecs;
                data.time = formatTime(timerSecs);
                await saveData(getFormData());
            };
        }
        if (resetBtn && timeInput) {
            resetBtn.onclick = async () => {
                if (timerInterval) { clearInterval(timerInterval); timerInterval=null; }
                timerSecs = 0;
                baseSecs = 0;
                startTime = null;
                timeInput.value = formatTime(timerSecs);
                data.timerRunning = false;
                data.timerStart = null;
                data.timerBase = 0;
                data.time = formatTime(timerSecs);
                await saveData(getFormData());
            };
        }

        const stInput = container.querySelector('#sb-stoppage');
        const stAddBtn = container.querySelector('#sb-add-st');
        const stToggleBtn = container.querySelector('#sb-toggle-st');

        if(stAddBtn && stInput){
            stAddBtn.onclick = () => { stInput.value = (parseInt(stInput.value)||0) + 1; };
        }
        if(stToggleBtn){
            stToggleBtn.onclick = async () => {
                data.showStoppage = !data.showStoppage;
                const obj = getFormData();
                await saveData(obj);
                await updateOverlayState(eventId,{ scoreboard: obj });
                render(obj);
            };
        }

        const etBtn = container.querySelector('#sb-toggle-et');
        if(etBtn){
            etBtn.onclick = async () => {
                data.extraTime = !data.extraTime;
                const obj = getFormData();
                await saveData(obj);
                render(obj);
            };
        }

        const dartVal = container.querySelector('#dart-val');
        const dartBtnA = container.querySelector('#dart-a');
        const dartBtnB = container.querySelector('#dart-b');
        const newLegBtn = container.querySelector('#new-leg');

        function addDart(team){
            const val = parseInt(dartVal.value) || 0;
            data.dartLogs[team].push(val);
            data.dartStats[team].throws += 1;
            data.scores[team] = Math.max(0, (data.scores[team]||0) - val);
            if(val === 180) data.dartStats[team].count180 += 1;
            if(val >= 140) data.dartStats[team].count140 += 1;
            if(val >= 100) data.dartStats[team].count100 += 1;
            if(data.scores[team] === 0){
                const checkout = (cfg.scoreboard.start||0) - data.scores[team];
                if(checkout > data.dartStats[team].highCheckout) data.dartStats[team].highCheckout = checkout;
            }
            updateDartStats();
        }
        function newLeg(){
            const start = cfg.scoreboard.start || 0;
            data.scores = data.scores.map(()=>start);
            if(data.legs) data.legs = data.legs.map(l=>l+1);
            data.dartLogs = data.dartLogs.map(()=>[]);
            data.dartStats = data.dartStats.map(st=>({throws:0,highCheckout:st.highCheckout,count180:0,count140:0,count100:0}));
            updateDartStats();
            render(data);
        }
        if(dartBtnA) dartBtnA.onclick=()=>addDart(0);
        if(dartBtnB) dartBtnB.onclick=()=>addDart(1);
        if(newLegBtn) newLegBtn.onclick=newLeg;

        function updateDartStats(){
            const statDiv = container.querySelector('#dart-stats');
            if(!statDiv) return;
            const start = data.start || cfg.scoreboard.start || 0;
            const parts = data.dartStats.map((st,i)=>{
                const avg = st.throws ? (((start - data.scores[i]) / st.throws) * 3).toFixed(1) : '0';
                const teamName = getTeam(i).name || `Team ${i+1}`;
                return `${teamName}: 3DA ${avg} | HC ${st.highCheckout} | 180s ${st.count180} | 140+ ${st.count140} | 100+ ${st.count100}`;
            });
            statDiv.textContent = parts.join(' \u00A0 ');
        }

        const turnSel = container.querySelector('#sb-turn');
        if (turnSel) {
            turnSel.value = data.turn || 0;
            turnSel.onchange = () => {
                if (cfg.scoreboard.breaks) {
                    const br = container.querySelector('#sb-break');
                    if (br) br.value = 0;
                }
            };
        }

        function getFormData() {
            const obj = { scores: (data.scores || []).map((_,i)=> parseInt(container.querySelector(`#team-score-${i}`).value) || 0) };
            if (cfg.scoreboard.periods) obj.period = parseInt(container.querySelector('#sb-period').value) || 1;
            if (cfg.scoreboard.time) {
                obj.time = container.querySelector('#sb-time').value;
                obj.timerStart = data.timerStart || null;
                obj.timerBase = data.timerBase || parseTime(obj.time);
                obj.timerRunning = data.timerRunning || false;
                obj.timeDirection = data.timeDirection || cfg.scoreboard.timeDirection || 'up';
                obj.stoppage = parseInt(container.querySelector('#sb-stoppage').value) || 0;
                obj.showStoppage = data.showStoppage || false;
            }
            if (cfg.scoreboard.round) obj.round = parseInt(container.querySelector('#sb-round').value) || 1;
            if (cfg.scoreboard.sets) obj.sets = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-set-${i}`).value) || 0);
            if (cfg.scoreboard.games) obj.games = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-game-${i}`).value) || 0);
            if (cfg.scoreboard.frames) {
                obj.frames = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-frame-${i}`).value) || 0);
                if (sport === 'Snooker') {
                    obj.frameFormat = container.querySelector('#sb-frame-format').value || 'firstTo';
                    obj.frameTarget = parseInt(container.querySelector('#sb-frame-target').value) || 0;
                }
            }
            if (cfg.scoreboard.legs) obj.legs = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-leg-${i}`).value) || 0);
            if (cfg.scoreboard.points) obj.points = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-point-${i}`).value) || 0);
            if (cfg.scoreboard.overs) obj.overs = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-over-${i}`).value) || 0);
            if (cfg.scoreboard.balls) obj.balls = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-ball-${i}`).value) || 0);
            if (cfg.scoreboard.wickets) obj.wickets = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-wkt-${i}`).value) || 0);
            if (cfg.scoreboard.runRate) obj.runRate = parseFloat(container.querySelector('#sb-runrate').value) || 0;
            if (cfg.scoreboard.requiredRate) obj.requiredRate = parseFloat(container.querySelector('#sb-reqrate').value) || 0;
            if (cfg.scoreboard.target) obj.target = parseInt(container.querySelector('#sb-target').value) || 0;
            if (cfg.scoreboard.pitchCount) obj.pitchCount = {
                balls: parseInt(container.querySelector('#sb-balls').value) || 0,
                strikes: parseInt(container.querySelector('#sb-strikes').value) || 0
            };
            if (cfg.scoreboard.outs) obj.outs = parseInt(container.querySelector('#sb-outs').value) || 0;
            if (cfg.scoreboard.bases) obj.bases = [1,2,3].map(i=>container.querySelector(`#sb-base${i}`).checked);
            if (cfg.scoreboard.breaks) obj.currentBreak = parseInt(container.querySelector('#sb-break').value) || 0;
            if (cfg.scoreboard.highBreak) obj.highBreak = parseInt(container.querySelector('#sb-highbreak').value) || 0;
            if (cfg.scoreboard.turn) obj.turn = parseInt(container.querySelector('#sb-turn').value) || 0;
            obj.extraTime = data.extraTime || false;
            if(data.shootout){
                obj.shootout = { shots: [[],[]] };
                [0,1].forEach(t=>{
                    obj.shootout.shots[t] = Array.from({length:5}).map((_,i)=>{
                        const pEl = container.querySelector(`#shot-player-${t}-${i}`);
                        const rEl = container.querySelector(`#shot-res-${t}-${i}`);
                        if(pEl || rEl){
                            return { player: pEl?.value || '', result: rEl?.value || '' };
                        }
                        const prev = data.shootout?.shots?.[t]?.[i] || {player:'', result:''};
                        return { player: prev.player || '', result: prev.result || '' };
                    });
                });
            }else if(goalSport){
                obj.shootout = data.shootout || { shots:[[],[]] };
            }
            if (sport === 'Darts' && data.checkoutText) {
                obj.checkoutPlayer = data.checkoutPlayer;
                obj.checkoutText = data.checkoutText;
                obj.dartStats = data.dartStats || [];
                obj.dartLogs = data.dartLogs || [];
            }
            obj.style = data.style || 'style1';
            obj.position = data.position || 'bottom-center';
            obj.transitionIn = data.transitionIn || 'fade';
            obj.transitionOut = data.transitionOut || 'fade';
            obj.abbreviate = data.abbreviate || false;
            obj.showLogos = data.showLogos !== false;
            return obj;
        }

        async function saveData(obj){
            await set(getScoreboardRef(eventId), obj);
            await updateOverlayState(eventId, { scoreboard: obj });
        }

        const saveBtn = container.querySelector('#sb-save');
        if (saveBtn) saveBtn.onclick = async () => {
            const newData = getFormData();
            if(currentData && newData.scores){
                const diffA = (newData.scores[0]||0) - (currentData.scores?.[0]||0);
                const diffB = (newData.scores[1]||0) - (currentData.scores?.[1]||0);
                for(let i=0;i<diffA;i++) await addMatchLog(eventId,{ts:Date.now(),type:'Goal',team:'a',player:'',time:newData.time});
                for(let i=0;i<diffB;i++) await addMatchLog(eventId,{ts:Date.now(),type:'Goal',team:'b',player:'',time:newData.time});
            }
            await saveData(newData);
            currentData = newData;
        };
        const previewBtn = container.querySelector('#sb-preview');
        if (previewBtn) previewBtn.onclick = async () => {
            const newData = getFormData();
            await saveData(newData);
            const show = !sbPreview;
            await updateOverlayState(eventId, { scoreboardPreviewVisible: show });
        };
        const liveBtn = container.querySelector('#sb-live');
        if (liveBtn) liveBtn.onclick = async () => {
            const newData = getFormData();
            await saveData(newData);
            const show = !sbVisible;
            await updateOverlayState(eventId, { scoreboardVisible: show, scoreboardPreviewVisible: false });
        };

        const breakBtn = container.querySelector('#sb-show-break');
        if (breakBtn) {
            breakBtn.onclick = async () => {
                const newData = getFormData();
                await saveData(newData);
                const show = !breakVisible;
                await updateOverlayState(eventId, {
                    scoreboardVisible: true,
                    breakVisible: show,
                    breakPlayer: show ? (newData.turn || 0) : null,
                    scoreboard: newData
                });
                breakVisible = show;
                render(newData);
            };
        }
        const highBtn = container.querySelector('#sb-show-high');
        if (highBtn) {
            highBtn.onclick = async () => {
                const newData = getFormData();
                await saveData(newData);
                const show = !highBreakVisible;
                await updateOverlayState(eventId, { highBreakVisible: show, scoreboard: newData });
                highBreakVisible = show;
                render(newData);
            };
        }
        const modal = container.querySelector('#sb-modal');
        const styleSel = container.querySelector('#sb-style');
        const posSel = container.querySelector('#sb-position');
        const transInSel = container.querySelector('#sb-trans-in');
        const transOutSel = container.querySelector('#sb-trans-out');
        const abbrevChk = container.querySelector('#sb-abbrev');
        const showLogoChk = container.querySelector('#sb-show-logos');
        const prevDiv = container.querySelector('#sb-prev');
        function updatePreview() {
            if (!prevDiv) return;
            const tA = teamsData?.teams ? teamsData.teams[teamsData.currentA||0] : teamsData?.teamA || {name:'Team 1',abbrev:'T1',color:'#333',logo:''};
            const tB = teamsData?.teams ? teamsData.teams[teamsData.currentB||1] : teamsData?.teamB || {name:'Team 2',abbrev:'T2',color:'#333',logo:''};
            const colA = tA.color || '#333';
            const colB = tB.color || '#333';
            const nameAFull = tA.name || 'Team 1';
            const nameBFull = tB.name || 'Team 2';
            const abbrA = tA.abbrev || suggestAbbreviation(nameAFull);
            const abbrB = tB.abbrev || suggestAbbreviation(nameBFull);
            const useAbbrev = abbrevChk?.checked;
            const nameA = useAbbrev ? abbrA : nameAFull;
            const nameB = useAbbrev ? abbrB : nameBFull;
            const longest = Math.max(nameA.length, nameB.length);
            const logoA = resolveAssetPath(tA.logo || '');
            const logoB = resolveAssetPath(tB.logo || '');
            const showLogo = (showLogoChk?.checked ?? true) && logoA && logoB;
            const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary') || '#e16316';
            const textA = contrastColor(colA);
            const textB = contrastColor(colB);
            const textBrand = contrastColor(brand);
            if(styleSel.value.startsWith('cricket')){
                prevDiv.innerHTML = `<div class="sb-container sb-cricket sb-${styleSel.value}" style="--sb-team-width:${longest}ch"><div class="sb-row"><span class="sb-team" style="background:${colA};color:${textA}">${nameA}</span><span class="sb-score" style="background:${brand};color:${textBrand}">0/0</span><span class="sb-overs">0.0</span><span class="sb-team" style="background:${colB};color:${textB}">${nameB}</span><span class="sb-score" style="background:${brand};color:${textBrand}">0/0</span><span class="sb-overs">0.0</span></div><div class="sb-row detail"><span class="sb-detail">RR 0</span><span class="sb-detail">Target 0</span><span class="sb-detail">Req 0</span></div></div>`;
            }else{
                prevDiv.innerHTML = `
                <div class="sb-container sb-${styleSel.value}" style="--sb-team-width:${longest}ch">
                    <div class="sb-row">
                        <span class="sb-team" style="background:${colA};color:${textA}">${showLogo ? `<img src="${logoA}" class="sb-team-logo">` : ''}${nameA}</span>
                        <span class="sb-score" style="background:${brand};color:${textBrand}">0 | 0</span>
                        <span class="sb-team" style="background:${colB};color:${textB}">${showLogo ? `<img src="${logoB}" class="sb-team-logo">` : ''}${nameB}</span>
                    </div>
                </div>`;
            }
        }
        if (styleSel) styleSel.onchange = updatePreview;
        if (posSel) posSel.onchange = updatePreview;
        if (abbrevChk) abbrevChk.onchange = updatePreview;
        if (showLogoChk) showLogoChk.onchange = updatePreview;
        if (container.querySelector('#sb-edit')) {
            container.querySelector('#sb-edit').onclick = () => {
                if (styleSel) styleSel.value = data.style || 'style1';
                if (posSel) posSel.value = data.position || 'bottom-center';
                if (transInSel) transInSel.value = data.transitionIn || 'fade';
                if (transOutSel) transOutSel.value = data.transitionOut || 'fade';
                if (abbrevChk) abbrevChk.checked = data.abbreviate || false;
                if (showLogoChk) showLogoChk.checked = data.showLogos !== false;
                updatePreview();
                modal.style.display = 'flex';
            };
        }
        const favBtn = container.querySelector('#sb-fav');
        if(favBtn){
            favBtn.onclick = () => {
                favorites.scoreboard = !favorites.scoreboard;
                if(!favorites.scoreboard && favorites.shortcuts){
                    Object.keys(favorites.shortcuts).forEach(k=>{ const sc=favorites.shortcuts[k]; if(sc.type==='scoreboard') delete favorites.shortcuts[k]; });
                }
                updateFavorites(eventId, favorites);
                render(data);
            };
        }
        if (container.querySelector('#sb-modal-cancel')) {
            container.querySelector('#sb-modal-cancel').onclick = () => { modal.style.display = 'none'; };
        }
        if (container.querySelector('#sb-modal-save')) {
            container.querySelector('#sb-modal-save').onclick = async () => {
                data.style = styleSel.value;
                data.position = posSel.value;
                data.transitionIn = transInSel ? transInSel.value : 'fade';
                data.transitionOut = transOutSel ? transOutSel.value : 'fade';
                data.abbreviate = abbrevChk ? abbrevChk.checked : false;
                data.showLogos = showLogoChk ? showLogoChk.checked : true;
                modal.style.display = 'none';
                const newData = getFormData();
                await saveData(newData);
                render(data);
            };
        }
        if (!container.dataset.heartbeat) {
            setInterval(() => localStorage.setItem('sportsHeartbeat', Date.now().toString()), 5000);
            container.dataset.heartbeat = 'true';
        }
        updateDartStats();
    }
}
