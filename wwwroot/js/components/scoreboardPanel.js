import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";

const db = getDatabaseInstance();

function getScoreboardRef(eventId) {
    return ref(db, `scoreboard/${eventId}`);
}

export function renderScoreboardPanel(container, sport = 'Football', eventId = 'demo') {
    const cfg = sportsData[sport] || sportsData['Football'];

    onValue(getScoreboardRef(eventId), snap => {
        const data = snap.val() || defaultData();
        render(data);
    });

    function defaultData() {
        const teams = Array.from({ length: cfg.teamCount }).map((_, i) => ({ name: `Team ${i + 1}`, score: 0 }));
        const base = { teams };
        if (cfg.scoreboard.periods) base.period = 1;
        if (cfg.scoreboard.time) base.time = '00:00';
        if (cfg.scoreboard.round) base.round = 1;
        if (cfg.scoreboard.sets) base.sets = teams.map(() => 0);
        if (cfg.scoreboard.games) base.games = teams.map(() => 0);
        if (cfg.scoreboard.frames) base.frames = teams.map(() => 0);
        if (cfg.scoreboard.legs) base.legs = teams.map(() => 0);
        if (cfg.scoreboard.points) base.points = teams.map(() => 0);
        return base;
    }

    function render(data) {
        container.innerHTML = `
            <div class='scoreboard-panel'>
                <h2 class="font-bold text-lg mb-2">${sport} Scoreboard</h2>
                <div id="sb-fields" class="space-y-2"></div>
                <button id="sb-save" class="control-button btn-sm mt-2">Save</button>
            </div>`;
        const fieldsDiv = container.querySelector('#sb-fields');
        const htmlParts = [];
        data.teams.forEach((t, i) => {
            htmlParts.push(`<div><input class="border p-1 w-24 mr-2" id="team-name-${i}" value="${t.name}"><input type="number" class="border p-1 w-16" id="team-score-${i}" value="${t.score}"></div>`);
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
        if (cfg.scoreboard.sets) {
            htmlParts.push(`<div><label>Sets:</label>${data.teams.map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-set-${i}" value="${(data.sets && data.sets[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.games) {
            htmlParts.push(`<div><label>Games:</label>${data.teams.map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-game-${i}" value="${(data.games && data.games[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.frames) {
            htmlParts.push(`<div><label>Frames:</label>${data.teams.map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-frame-${i}" value="${(data.frames && data.frames[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.legs) {
            htmlParts.push(`<div><label>Legs:</label>${data.teams.map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-leg-${i}" value="${(data.legs && data.legs[i]) || 0}">`).join('')}</div>`);
        }
        if (cfg.scoreboard.points) {
            htmlParts.push(`<div><label>Points:</label>${data.teams.map((_,i)=>`<input type="number" class="border p-1 w-12 mx-1" id="sb-point-${i}" value="${(data.points && data.points[i]) || 0}">`).join('')}</div>`);
        }
        fieldsDiv.innerHTML = htmlParts.join('');
        container.querySelector('#sb-save').onclick = async () => {
            const newData = { teams: data.teams.map((_,i)=>({ name: container.querySelector(`#team-name-${i}`).value, score: parseInt(container.querySelector(`#team-score-${i}`).value) || 0 })) };
            if (cfg.scoreboard.periods) newData.period = parseInt(container.querySelector('#sb-period').value) || 1;
            if (cfg.scoreboard.time) newData.time = container.querySelector('#sb-time').value;
            if (cfg.scoreboard.round) newData.round = parseInt(container.querySelector('#sb-round').value) || 1;
            if (cfg.scoreboard.sets) newData.sets = data.teams.map((_,i)=>parseInt(container.querySelector(`#sb-set-${i}`).value) || 0);
            if (cfg.scoreboard.games) newData.games = data.teams.map((_,i)=>parseInt(container.querySelector(`#sb-game-${i}`).value) || 0);
            if (cfg.scoreboard.frames) newData.frames = data.teams.map((_,i)=>parseInt(container.querySelector(`#sb-frame-${i}`).value) || 0);
            if (cfg.scoreboard.legs) newData.legs = data.teams.map((_,i)=>parseInt(container.querySelector(`#sb-leg-${i}`).value) || 0);
            if (cfg.scoreboard.points) newData.points = data.teams.map((_,i)=>parseInt(container.querySelector(`#sb-point-${i}`).value) || 0);
            await set(getScoreboardRef(eventId), newData);
        };
        if (!container.dataset.heartbeat) {
            setInterval(() => localStorage.setItem('sportsHeartbeat', Date.now().toString()), 5000);
            container.dataset.heartbeat = 'true';
        }
    }
}
