import { ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { updateOverlayState } from "../firebase.js";

const db = getDatabaseInstance();

function getRef(eventId){
    return ref(db, `tournament/${eventId}`);
}

function getTeamsRef(eventId){
    return ref(db, `teams/${eventId}`);
}

export function renderTournamentPanel(container, eventId, sport='Football'){
    let data = null;
    let teams = null;
    onValue(getRef(eventId), snap=>{ data = snap.val() || defaultData(); render(); });
    onValue(getTeamsRef(eventId), snap=>{ teams = snap.val(); render(); });

    function defaultData(){
        return { format:'Round Robin', pointsWin:3, pointsDraw:1, pointsLoss:0, currentMatch:0, matches:[] };
    }

    function render(){
        if(!data) data = defaultData();
        const teamList = teams?.teams || [];
        const teamOptions = teamList.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('');
        const matchRows = (data.matches||[]).map((m,i)=>{
            return `<tr>
                <td><select data-a="${i}" class="border p-1">${teamOptions}</select></td>
                <td class="px-1">vs</td>
                <td><select data-b="${i}" class="border p-1">${teamOptions}</select></td>
                <td><input type="number" data-sa="${i}" class="border p-1 w-12" value="${m.scoreA||0}"></td>
                <td>-</td>
                <td><input type="number" data-sb="${i}" class="border p-1 w-12" value="${m.scoreB||0}"></td>
                <td><button data-live="${i}" class="control-button btn-xs">Live</button>
                    <button data-inst="${i}" class="control-button btn-xs ml-1">New</button>
                    <button data-show="${i}" class="control-button btn-xs ml-1">Result</button>
                    <button data-del="${i}" class="control-button btn-xs ml-1">X</button></td>
            </tr>`;
        }).join('');
        container.innerHTML = `
            <div class='tournament-panel'>
                <h2 class="font-bold text-lg mb-2">Tournament</h2>
                <div class="mb-2 text-sm">
                    <label>Format <select id="tn-format" class="border p-1 ml-1">
                        <option value="Round Robin">Round Robin</option>
                        <option value="Knockout">Knockout</option>
                    </select></label>
                </div>
                <div class="mb-2 text-sm">
                    <label>W</label><input id="tn-pw" type="number" class="border p-1 w-12 ml-1" value="${data.pointsWin}">
                    <label class="ml-2">D</label><input id="tn-pd" type="number" class="border p-1 w-12 ml-1" value="${data.pointsDraw}">
                    <label class="ml-2">L</label><input id="tn-pl" type="number" class="border p-1 w-12 ml-1" value="${data.pointsLoss}">
                    <button id="tn-save-settings" class="control-button btn-xs ml-2">Save</button>
                </div>
                <table id="tn-table" class="text-sm w-full mb-2">${matchRows}</table>
                <button id="add-match" class="control-button btn-sm">Add Match</button>
                <button id="hide-results" class="control-button btn-sm ml-2">Hide Results</button>
            </div>`;
        container.querySelector('#tn-format').value = data.format || 'Round Robin';
        const table = container.querySelector('#tn-table');
        (data.matches||[]).forEach((m,i)=>{
            table.querySelector(`select[data-a="${i}"]`).value = m.teamA ?? 0;
            table.querySelector(`select[data-b="${i}"]`).value = m.teamB ?? 0;
        });
        container.querySelector('#add-match').onclick = () => {
            data.matches.push({teamA:0, teamB:1, scoreA:0, scoreB:0});
            set(getRef(eventId), data);
        };
        container.querySelector('#tn-save-settings').onclick = () => {
            data.format = container.querySelector('#tn-format').value;
            data.pointsWin = parseInt(container.querySelector('#tn-pw').value)||0;
            data.pointsDraw = parseInt(container.querySelector('#tn-pd').value)||0;
            data.pointsLoss = parseInt(container.querySelector('#tn-pl').value)||0;
            set(getRef(eventId), data);
        };
        table.querySelectorAll('select').forEach(sel=>{
            sel.onchange = ()=>{
                const idx = parseInt(sel.dataset.a||sel.dataset.b,10);
                if(sel.dataset.a!=null) data.matches[idx].teamA = parseInt(sel.value,10);
                else data.matches[idx].teamB = parseInt(sel.value,10);
                set(getRef(eventId), data);
            };
        });
        table.querySelectorAll('input[type="number"]').forEach(inp=>{
            inp.onchange = ()=>{
                const idx = parseInt(inp.dataset.sa||inp.dataset.sb,10);
                if(inp.dataset.sa!=null) data.matches[idx].scoreA = parseInt(inp.value,10)||0;
                else data.matches[idx].scoreB = parseInt(inp.value,10)||0;
                set(getRef(eventId), data);
            };
        });
        table.querySelectorAll('button[data-del]').forEach(btn=>{
            btn.onclick = ()=>{
                const idx = parseInt(btn.dataset.del,10);
                data.matches.splice(idx,1);
                set(getRef(eventId), data);
            };
        });
        table.querySelectorAll('button[data-show]').forEach(btn=>{
            btn.onclick = ()=>{
                const idx = parseInt(btn.dataset.show,10);
                const m = data.matches[idx];
                if(!teams || !teams.teams) return;
                const tA = teams.teams[m.teamA] || {name:'Team 1'};
                const tB = teams.teams[m.teamB] || {name:'Team 2'};
                updateOverlayState(eventId, { results: { teamA:{name:tA.name,score:m.scoreA,scorers:[]}, teamB:{name:tB.name,score:m.scoreB,scorers:[]} }, resultsVisible:true });
            };
        });
        table.querySelectorAll('button[data-live]').forEach(btn=>{
            btn.onclick = async ()=>{
                const idx = parseInt(btn.dataset.live,10);
                const m = data.matches[idx];
                if(!teams || !teams.teams || !m) return;
                teams.currentA = m.teamA;
                teams.currentB = m.teamB;
                set(getTeamsRef(eventId), teams);
                data.currentMatch = idx;
                set(getRef(eventId), data);
                await set(ref(db, `scoreboard/${eventId}`), null);
            };
        });
        table.querySelectorAll('button[data-inst]').forEach(btn=>{
            btn.onclick = async ()=>{
                const idx = parseInt(btn.dataset.inst,10);
                if(!teams || !teams.teams || !data.matches[idx]) return;
                const m = data.matches[idx];
                const tA = teams.teams[m.teamA] || { name: 'Team 1', players: [] };
                const tB = teams.teams[m.teamB] || { name: 'Team 2', players: [] };
                const newId = `${eventId}-m${idx+1}`;
                await set(ref(db, `teams/${newId}`), { teamA: tA, teamB: tB, showPhotosFormation:false, showPhotosStats:false, showPhotosSubs:false });
                await set(ref(db, `scoreboard/${newId}`), null);
                const metaSnap = await get(ref(db, `events/${eventId}`));
                const meta = metaSnap.val() || {};
                meta.tournament = false;
                meta.title = `${meta.title || eventId} Match ${idx+1}`;
                await set(ref(db, `events/${newId}`), meta);
                window.open(`graphics.html?event_id=${newId}`, '_blank');
            };
        });
        container.querySelector('#hide-results').onclick = ()=>{
            updateOverlayState(eventId,{resultsVisible:false});
        };
    }
}
