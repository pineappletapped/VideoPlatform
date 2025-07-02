import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { updateOverlayState, listenOverlayState } from "../firebase.js";

const scoreboardStyles = [
    { id: 'style1', label: 'Classic' },
    { id: 'style2', label: 'Dark Box' },
    { id: 'style3', label: 'Outline' },
    { id: 'style4', label: 'Light' },
    { id: 'style5', label: 'Solid' },
    { id: 'h1', label: 'Horizontal 1' },
    { id: 'h2', label: 'Horizontal 2' }
];
const scoreboardPositions = [
    { value: 'top-left', label: 'Top Left' },
    { value: 'top-right', label: 'Top Right' },
    { value: 'top-center', label: 'Top Center' },
    { value: 'bottom-left', label: 'Bottom Left' },
    { value: 'bottom-right', label: 'Bottom Right' },
    { value: 'bottom-center', label: 'Bottom Center' }
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

export function renderScoreboardPanel(container, sport = 'Football', eventId = 'demo') {
    const cfg = sportsData[sport] || sportsData['Football'];

    let teamsData = null;
    let currentData = null;
    let timerInterval = null;

    const teamsRef = ref(db, `teams/${eventId}`);
    onValue(teamsRef, snap => { teamsData = snap.val(); if(currentData) render(currentData); });

    let sbVisible = false;
    let sbPreview = false;
    let breakVisible = false;
    let highBreakVisible = false;

    listenOverlayState(eventId, state => {
        sbVisible = (state && state.scoreboardVisible) || false;
        sbPreview = (state && state.scoreboardPreviewVisible) || false;
        breakVisible = (state && state.breakVisible) || false;
        highBreakVisible = (state && state.highBreakVisible) || false;
        if (currentData) render(currentData);
    });

    onValue(getScoreboardRef(eventId), snap => {
        currentData = snap.val() || defaultData();
        render(currentData);
        updateOverlayState(eventId, { scoreboard: currentData });
    });

    function defaultData() {
        const startVal = cfg.scoreboard.start || 0;
        const scores = Array.from({ length: cfg.teamCount }).map(() => startVal);
        const base = { scores, style: 'style1', position: 'bottom-center' };
        if (cfg.scoreboard.periods) base.period = 1;
        if (cfg.scoreboard.time) base.time = '00:00';
        if (cfg.scoreboard.round) base.round = 1;
        if (cfg.scoreboard.sets) base.sets = scores.map(() => 0);
        if (cfg.scoreboard.games) base.games = scores.map(() => 0);
        if (cfg.scoreboard.frames) base.frames = scores.map(() => 0);
        if (cfg.scoreboard.legs) base.legs = scores.map(() => 0);
        if (cfg.scoreboard.points) base.points = scores.map(() => 0);
        if (cfg.scoreboard.breaks) base.currentBreak = 0;
        if (cfg.scoreboard.highBreak) base.highBreak = 0;
        if (cfg.scoreboard.turn) base.turn = 0;
        return base;
    }

    function render(data) {
        if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
        container.innerHTML = `
            <div class='scoreboard-panel'>
                <h2 class="font-bold text-lg mb-2">${sport} Scoreboard</h2>
                <div class="mb-2 flex gap-2">
                    <button id="sb-preview" class="control-button btn-sm btn-preview${sbPreview ? ' ring-2 ring-brand' : ''}">Preview</button>
                    <button id="sb-live" class="control-button btn-sm btn-live${sbVisible ? ' ring-2 ring-green-400' : ''}">Live</button>
                    <button id="sb-hide" class="control-button btn-sm${!sbVisible && !sbPreview ? ' ring-2 ring-red-400' : ''}">Hide</button>
                    ${cfg.scoreboard.breaks ? `<button id="sb-show-break" class="control-button btn-sm${breakVisible ? ' ring-2 ring-green-400' : ''}">Show Break</button>` : ''}
                    ${cfg.scoreboard.highBreak ? `<button id="sb-show-high" class="control-button btn-sm${highBreakVisible ? ' ring-2 ring-green-400' : ''}">Show High Break</button>` : ''}
                    <button id="sb-save" class="control-button btn-sm ml-auto">Save</button>
                    <button id="sb-edit" class="control-button btn-sm">Edit</button>
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
                        <div id="sb-prev" class="mt-2 flex justify-center"></div>
                        <div class="flex gap-2 mt-4">
                            <button id="sb-modal-save" class="control-button btn-sm">Save</button>
                            <button id="sb-modal-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </div>
                </div>
            </div>`;
        const table = container.querySelector('#sb-table');
        const htmlParts = [];
        (data.scores || []).forEach((sc, i) => {
            const name = teamsData ? (i === 0 ? teamsData.teamA?.name : teamsData.teamB?.name) : `Team ${i + 1}`;
            const color = teamsData ? (i === 0 ? teamsData.teamA?.color || '#ffffff' : teamsData.teamB?.color || '#ffffff') : '#ffffff';
            const textCol = contrastColor(color);
            const activeClass = cfg.scoreboard.turn && data.turn === i ? ' class="active-player"' : '';
            const checkout = sport === 'Darts' ? getCheckout(sc) : null;
            const checkoutHtml = checkout ? `<span id="checkout-${i}" class="text-xs ml-2">${checkout}</span><button id="checkout-btn-${i}" class="control-button btn-xs ml-1">Show</button>` : '';
            htmlParts.push(`<tr${activeClass}><td class="pr-2 whitespace-nowrap" style="background:${color};color:${textCol};min-width:6rem;text-align:center;">${name}</td><td><div class="flex items-center"><input type="number" class="border p-1 w-16" id="team-score-${i}" value="${sc}"><span id="score-btns-${i}" class="ml-1"></span>${checkoutHtml}</div></td></tr>`);
        });
        if (cfg.scoreboard.periods) {
            htmlParts.push(`<tr><td class="pr-2">${cfg.scoreboard.periodLabel || 'Period'}:</td><td><input type="number" class="border p-1 w-16" id="sb-period" value="${data.period || 1}"></td></tr>`);
        }
        if (cfg.scoreboard.time) {
            const dir = cfg.scoreboard.timeDirection === 'down' ? 'down' : 'up';
            htmlParts.push(`<tr><td class="pr-2">Time (${dir}):</td><td><div class="flex items-center gap-1"><input type="text" class="border p-1 w-20" id="sb-time" value="${data.time || '00:00'}" placeholder="mm:ss"><button id="sb-start" class="control-button btn-xs">Start</button><button id="sb-stop" class="control-button btn-xs">Stop</button><button id="sb-reset" class="control-button btn-xs">Reset</button></div></td></tr>`);
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
        }
        if (cfg.scoreboard.legs) {
            htmlParts.push(`<tr><td class="pr-2">Legs:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-leg-${i}" value="${(data.legs && data.legs[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.points) {
            htmlParts.push(`<tr><td class="pr-2">Points:</td><td>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-point-${i}" value="${(data.points && data.points[i]) || 0}">`).join('')}</td></tr>`);
        }
        if (cfg.scoreboard.breaks) {
            htmlParts.push(`<tr><td class="pr-2">Current Break:</td><td><input type="number" class="border p-1 w-16" id="sb-break" value="${data.currentBreak || 0}"></td></tr>`);
        }
        if (cfg.scoreboard.highBreak) {
            htmlParts.push(`<tr><td class="pr-2">High Break:</td><td><input type="number" class="border p-1 w-16" id="sb-highbreak" value="${data.highBreak || 0}" disabled></td></tr>`);
        }
        if (cfg.scoreboard.turn) {
            const optA = teamsData ? teamsData.teamA?.name || 'Team 1' : 'Team 1';
            const optB = teamsData ? teamsData.teamB?.name || 'Team 2' : 'Team 2';
            htmlParts.push(`<tr><td class="pr-2">In Play:</td><td><select id="sb-turn" class="border p-1"><option value="0">${optA}</option><option value="1">${optB}</option></select></td></tr>`);
        }
        table.innerHTML = htmlParts.join('');
        (data.scores || []).forEach((_, i) => {
            const holder = container.querySelector(`#score-btns-${i}`);
            if (holder && cfg.scoringButtons) {
                cfg.scoringButtons.forEach(btnCfg => {
                    const btn = document.createElement('button');
                    btn.textContent = btnCfg.label;
                    btn.className = 'score-btn btn-xs';
                    btn.style.background = btnCfg.color || '#666';
                    if (btnCfg.textColor) btn.style.color = btnCfg.textColor;
                    btn.addEventListener('click', () => {
                        const inp = container.querySelector(`#team-score-${i}`);
                        const val = parseInt(inp.value) || 0;
                        inp.value = val + btnCfg.value;
                        if (cfg.scoreboard.breaks && data.turn === i) {
                            const br = container.querySelector('#sb-break');
                            const hb = container.querySelector('#sb-highbreak');
                            if (br) {
                                br.value = (parseInt(br.value) || 0) + btnCfg.value;
                                if (hb && parseInt(br.value) > (parseInt(hb.value) || 0)) hb.value = br.value;
                            }
                        }
                    });
                    holder.appendChild(btn);
                });
            }
            const cBtn = container.querySelector(`#checkout-btn-${i}`);
            if (cBtn) {
                cBtn.addEventListener('click', async () => {
                    const val = parseInt(container.querySelector(`#team-score-${i}`).value) || 0;
                    const checkout = getCheckout(val);
                    if (checkout) {
                        data.checkoutPlayer = i;
                        data.checkoutText = checkout;
                        const obj = getFormData();
                        await updateOverlayState(eventId, { scoreboard: obj, scoreboardVisible: true });
                    }
                });
            }
            const inp = container.querySelector(`#team-score-${i}`);
            const cSpan = container.querySelector(`#checkout-${i}`);
            if (inp && cSpan) {
                inp.addEventListener('input', () => {
                    const ch = getCheckout(parseInt(inp.value) || 0);
                    cSpan.textContent = ch || '';
                });
            }
        });

        const timeInput = container.querySelector('#sb-time');
        const startBtn = container.querySelector('#sb-start');
        const stopBtn = container.querySelector('#sb-stop');
        const resetBtn = container.querySelector('#sb-reset');
        const parseTime = str => {
            const [m = '0', s = '0'] = str.split(':');
            return parseInt(m) * 60 + parseInt(s);
        };
        const formatTime = secs => `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
        const countDown = cfg.scoreboard.timeDirection === 'down';
        let baseSecs = timeInput ? parseTime(timeInput.value) : 0;
        let timerSecs = baseSecs;
        let startTime = null;
        const sendTime = () => {
            const obj = getFormData();
            obj.time = formatTime(timerSecs);
            updateOverlayState(eventId, { scoreboard: obj });
        };
        if (startBtn && timeInput) {
            startBtn.onclick = () => {
                if (timerInterval) return;
                baseSecs = parseTime(timeInput.value);
                timerSecs = baseSecs;
                startTime = Date.now();
                timerInterval = setInterval(() => {
                    const elapsed = Math.floor((Date.now() - startTime)/1000);
                    timerSecs = countDown ? Math.max(0, baseSecs - elapsed) : baseSecs + elapsed;
                    timeInput.value = formatTime(timerSecs);
                    sendTime();
                }, 1000);
            };
        }
        if (stopBtn) {
            stopBtn.onclick = () => {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                    const elapsed = Math.floor((Date.now() - startTime)/1000);
                    timerSecs = countDown ? Math.max(0, baseSecs - elapsed) : baseSecs + elapsed;
                    timeInput.value = formatTime(timerSecs);
                    sendTime();
                }
            };
        }
        if (resetBtn && timeInput) {
            resetBtn.onclick = () => {
                if (timerInterval) { clearInterval(timerInterval); timerInterval=null; }
                timerSecs = 0;
                timeInput.value = formatTime(timerSecs);
                sendTime();
            };
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
            if (cfg.scoreboard.time) obj.time = container.querySelector('#sb-time').value;
            if (cfg.scoreboard.round) obj.round = parseInt(container.querySelector('#sb-round').value) || 1;
            if (cfg.scoreboard.sets) obj.sets = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-set-${i}`).value) || 0);
            if (cfg.scoreboard.games) obj.games = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-game-${i}`).value) || 0);
            if (cfg.scoreboard.frames) obj.frames = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-frame-${i}`).value) || 0);
            if (cfg.scoreboard.legs) obj.legs = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-leg-${i}`).value) || 0);
            if (cfg.scoreboard.points) obj.points = (data.scores || []).map((_,i)=>parseInt(container.querySelector(`#sb-point-${i}`).value) || 0);
            if (cfg.scoreboard.breaks) obj.currentBreak = parseInt(container.querySelector('#sb-break').value) || 0;
            if (cfg.scoreboard.highBreak) obj.highBreak = parseInt(container.querySelector('#sb-highbreak').value) || 0;
            if (cfg.scoreboard.turn) obj.turn = parseInt(container.querySelector('#sb-turn').value) || 0;
            if (sport === 'Darts' && data.checkoutText) {
                obj.checkoutPlayer = data.checkoutPlayer;
                obj.checkoutText = data.checkoutText;
            }
            obj.style = data.style || 'style1';
            obj.position = data.position || 'bottom-center';
            return obj;
        }

        async function saveData(obj){
            await set(getScoreboardRef(eventId), obj);
            await updateOverlayState(eventId, { scoreboard: obj });
        }

        container.querySelector('#sb-save').onclick = async () => {
            const newData = getFormData();
            await saveData(newData);
        };
        container.querySelector('#sb-preview').onclick = async () => {
            const newData = getFormData();
            await saveData(newData);
            await updateOverlayState(eventId, { scoreboardPreviewVisible: true });
        };
        container.querySelector('#sb-live').onclick = async () => {
            const newData = getFormData();
            await saveData(newData);
            await updateOverlayState(eventId, { scoreboardVisible: true, scoreboardPreviewVisible: false });
        };
        container.querySelector('#sb-hide').onclick = async () => {
            await updateOverlayState(eventId, { scoreboardVisible: false, scoreboardPreviewVisible: false, breakVisible: false, highBreakVisible: false });
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
        const prevDiv = container.querySelector('#sb-prev');
        function updatePreview() {
            if (!prevDiv) return;
            const colA = teamsData?.teamA?.color || '#333';
            const colB = teamsData?.teamB?.color || '#333';
            const nameA = teamsData?.teamA?.name || 'Team 1';
            const nameB = teamsData?.teamB?.name || 'Team 2';
            const brand = getComputedStyle(document.documentElement).getPropertyValue('--brand-primary') || '#e16316';
            const textA = contrastColor(colA);
            const textB = contrastColor(colB);
            const textBrand = contrastColor(brand);
            prevDiv.innerHTML = `
                <div class="sb-container sb-${styleSel.value}">
                    <div class="sb-row">
                        <span class="sb-team" style="background:${colA};color:${textA}">${nameA}</span>
                        <span class="sb-score" style="background:${brand};color:${textBrand}">0 | 0</span>
                        <span class="sb-team" style="background:${colB};color:${textB}">${nameB}</span>
                    </div>
                </div>`;
        }
        if (styleSel) styleSel.onchange = updatePreview;
        if (posSel) posSel.onchange = updatePreview;
        if (container.querySelector('#sb-edit')) {
            container.querySelector('#sb-edit').onclick = () => {
                if (styleSel) styleSel.value = data.style || 'style1';
                if (posSel) posSel.value = data.position || 'bottom-center';
                updatePreview();
                modal.style.display = 'flex';
            };
        }
        if (container.querySelector('#sb-modal-cancel')) {
            container.querySelector('#sb-modal-cancel').onclick = () => { modal.style.display = 'none'; };
        }
        if (container.querySelector('#sb-modal-save')) {
            container.querySelector('#sb-modal-save').onclick = async () => {
                data.style = styleSel.value;
                data.position = posSel.value;
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
    }
}
