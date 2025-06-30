import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { updateOverlayState, listenOverlayState } from "../firebase.js";

const db = getDatabaseInstance();

function getScoreboardRef(eventId) {
    return ref(db, `scoreboard/${eventId}`);
}

export function renderScoreboardPanel(container, sport = 'Football', eventId = 'demo') {
    const cfg = sportsData[sport] || sportsData['Football'];

    let teamsData = null;
    let currentData = null;

    const teamsRef = ref(db, `teams/${eventId}`);
    onValue(teamsRef, snap => { teamsData = snap.val(); if(currentData) render(currentData); });

    let sbVisible = false;
    let sbPreview = false;

    listenOverlayState(eventId, state => {
        sbVisible = (state && state.scoreboardVisible) || false;
        sbPreview = (state && state.scoreboardPreviewVisible) || false;
    });

    onValue(getScoreboardRef(eventId), snap => {
        currentData = snap.val() || defaultData();
        render(currentData);
    });

    function defaultData() {
        const scores = Array.from({ length: cfg.teamCount }).map(() => 0);
        const base = { scores };
        if (cfg.scoreboard.periods) base.period = 1;
        if (cfg.scoreboard.time) base.time = '00:00';
        if (cfg.scoreboard.round) base.round = 1;
        if (cfg.scoreboard.sets) base.sets = scores.map(() => 0);
        if (cfg.scoreboard.games) base.games = scores.map(() => 0);
        if (cfg.scoreboard.frames) base.frames = scores.map(() => 0);
        if (cfg.scoreboard.legs) base.legs = scores.map(() => 0);
        if (cfg.scoreboard.points) base.points = scores.map(() => 0);
        return base;
    }

    function render(data) {
        container.innerHTML = `
            <div class='scoreboard-panel'>
                <h2 class="font-bold text-lg mb-2">${sport} Scoreboard</h2>
                <div class="mb-2 flex gap-2">
                    <button id="sb-preview" class="control-button btn-sm btn-preview${sbPreview ? ' ring-2 ring-brand' : ''}">Preview</button>
                    <button id="sb-live" class="control-button btn-sm btn-live${sbVisible ? ' ring-2 ring-green-400' : ''}">Live</button>
                    <button id="sb-hide" class="control-button btn-sm${!sbVisible && !sbPreview ? ' ring-2 ring-red-400' : ''}">Hide</button>
                    <button id="sb-save" class="control-button btn-sm ml-auto">Save</button>
                </div>
                <div id="sb-fields" class="space-y-2"></div>
            </div>`;
        const fieldsDiv = container.querySelector('#sb-fields');
        const htmlParts = [];
        (data.scores || []).forEach((sc, i) => {
            const name = teamsData ? (i === 0 ? teamsData.teamA?.name : teamsData.teamB?.name) : `Team ${i + 1}`;
            htmlParts.push(`<div class="flex items-center gap-1"><span class="mr-2">${name}</span><input type="number" class="border p-1 w-16" id="team-score-${i}" value="${sc}"><span id="score-btns-${i}" class="ml-1"></span></div>`);
        });
        if (cfg.scoreboard.periods) {
            htmlParts.push(`<div><label class="mr-2">${cfg.scoreboard.periodLabel || 'Period'}:</label><input type="number" class="border p-1 w-16" id="sb-period" value="${data.period || 1}"></div>`);
        }
        if (cfg.scoreboard.time) {
            htmlParts.push(`<div><label class="mr-2">Time:</label><input type="text" class="border p-1 w-24" id="sb-time" value="${data.time || ''}" placeholder="mm:ss"></div>`);
        }
        if (cfg.scoreboard.round) {
            htmlParts.push(`<div><label class="mr-2">Round:</label><input type="number" class="border p-1 w-16" id="sb-round" value="${data.round || 1}"></div>`);
        }
        const count = (data.scores || []).length;
        if (cfg.scoreboard.sets) {
            htmlParts.push(`<div><label>Sets:</label>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-set-${i}" value="${(data.sets && data.sets[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.games) {
            htmlParts.push(`<div><label>Games:</label>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-game-${i}" value="${(data.games && data.games[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.frames) {
            htmlParts.push(`<div><label>Frames:</label>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-frame-${i}" value="${(data.frames && data.frames[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.legs) {
            htmlParts.push(`<div><label>Legs:</label>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-leg-${i}" value="${(data.legs && data.legs[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.points) {
            htmlParts.push(`<div><label>Points:</label>${Array.from({length:count}).map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-point-${i}" value="${(data.points && data.points[i]) || 0}">`).join('')}</div>`);
        }
        fieldsDiv.innerHTML = htmlParts.join('');
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
                    });
                    holder.appendChild(btn);
                });
            }
        });

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
            await updateOverlayState(eventId, { scoreboardVisible: false, scoreboardPreviewVisible: false });
        };
        if (!container.dataset.heartbeat) {
            setInterval(() => localStorage.setItem('sportsHeartbeat', Date.now().toString()), 5000);
            container.dataset.heartbeat = 'true';
        }
    }
}
