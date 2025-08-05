import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { listenMatchLog } from "../firebase.js";
import { sportsData, getTeamLabel } from "../sportsConfig.js";

const db = getDatabaseInstance();

function getTeamsRef(eventId){
    return ref(db, `teams/${eventId}`);
}

async function uploadToServer(file, path){
    try{
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', path.replace(/^\/+/, ''));
        const resp = await fetch('upload.php', { method:'POST', body: fd });
        if(!resp.ok) throw new Error('upload failed');
        const data = await resp.json();
        return data.url;
    }catch(err){
        console.error('Upload failed', err);
        return null;
    }
}

export function renderTeamsPanel(container, eventId, sport='Football', tournament=false){
    const cfg = sportsData[sport] || sportsData['Football'];
    const label = getTeamLabel(sport);
    let currentData = null;
    let matchLogs = [];
    onValue(getTeamsRef(eventId), snap=>{ currentData = snap.val() || defaultData(); renderList(); });
    listenMatchLog(eventId, logs=>{ matchLogs = logs || []; renderList(); });

    function defaultData(){
        const count = cfg.playersPerTeam + (cfg.subs||0);
        const players = Array.from({length:count}).map((_,i)=>({
            name:'',
            number:'',
            pos:'',
            photo:'',
            status: i < cfg.playersPerTeam ? 'starting' : 'sub'
        }));
        const nameA = cfg.playersPerTeam === 1 ? 'Player 1' : 'Team A';
        const nameB = cfg.playersPerTeam === 1 ? 'Player 2' : 'Team B';
        if(!tournament){
            return { teamA:{name:nameA, players:players.slice()}, teamB:{name:nameB, players:players.slice()}, showPhotosFormation:false, showPhotosStats:false, showPhotosSubs:false };
        }else{
            return { teams:[{name:cfg.playersPerTeam === 1 ? 'Player 1' : 'Team 1', players:players.slice()},{name:cfg.playersPerTeam === 1 ? 'Player 2' : 'Team 2', players:players.slice()}], currentA:0, currentB:1, showPhotosFormation:false, showPhotosStats:false, showPhotosSubs:false };
        }
    }

    function renderList(){
        const teamA = tournament ? currentData.teams[currentData.currentA||0] : currentData.teamA;
        const teamB = tournament ? currentData.teams[currentData.currentB||1] : currentData.teamB;
        const photoIcon = p=> p?'<span class="text-green-400 ml-1">✔</span>':'';
        const cardMark = (name, key) => {
            const t = key === 'teamA' ? 'a' : 'b';
            const hasY = matchLogs.some(l=>l.team===t && l.playerName===name && l.type==='yellow card');
            const hasR = matchLogs.some(l=>l.team===t && l.playerName===name && l.type==='red card');
            let m = '';
            if(hasY) m += '<span class="ml-1 text-yellow-400">Y</span>';
            if(hasR) m += '<span class="ml-1 text-red-500">R</span>';
            return m;
        };
        const list = (team,key)=>team.players.filter(pl=>pl.status!=='not').map(pl=>{
            const sub = pl.status==='sub' ? ' <span class="text-xs">(sub)</span>' : '';
            return `<li class="flex justify-between border-b border-gray-700 py-1"><span>${pl.number?`#${pl.number} `:''}${pl.name}${sub}</span><span class="text-xs text-gray-400">${pl.pos}${cardMark(pl.name,key)}${photoIcon(pl.photo)}</span></li>`;
        }).join('');
        container.innerHTML = `
            <div class='teams-panel'>
                <h2 class="font-bold text-lg mb-2">${label}</h2>
                <div class="flex gap-4 text-sm mb-4">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold mb-1">${teamA.name}</h3>
                        <ul>${list(teamA)}</ul>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold mb-1">${teamB.name}</h3>
                        <ul>${list(teamB)}</ul>
                    </div>
                </div>
                <button id="teams-edit" class="control-button btn-sm">Edit</button>
                <div id="teams-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window max-h-[90vh] overflow-y-auto"></div>
                </div>
            </div>`;
        const editBtn = container.querySelector('#teams-edit');
        if(editBtn) editBtn.onclick = ()=>showEditModal();
    }

    function showEditModal(){
        const modal = container.querySelector('#teams-modal');
        const win = modal.querySelector('.modal-window');
        win.innerHTML = getEditFormHtml();
        modal.style.display='flex';
        setupEditHandlers(modal, win);
    }

    function getEditFormHtml(){
        const teamA = tournament ? currentData.teams[currentData.currentA||0] : currentData.teamA;
        const teamB = tournament ? currentData.teams[currentData.currentB||1] : currentData.teamB;
        const posOpts = cfg.positions.map(p=>`<option value="${p}">${p}</option>`).join('');
        const rowTpl = (prefix, pl) => `
            <tr draggable="true" data-status="${pl.status}" data-prefix="${prefix}">
                <td><input data-field="name" class="border p-1 w-full" value="${pl.name}"></td>
                <td><input data-field="num" class="border p-1 w-12" value="${pl.number||''}"></td>
                <td><select data-field="pos" class="border p-1 w-full"><option value=""></option>${posOpts}</select></td>
                <td><select data-field="status" class="border p-1 w-full"><option value="starting">Starting</option><option value="sub">Sub</option><option value="not">Not playing</option></select></td>
                <td><input data-field="photo" class="border p-1 w-full mb-1" placeholder="Photo URL" value="${pl.photo||''}"><input type="file" data-field="file" class="text-xs" accept="image/*"></td>
            </tr>`;
        const nameALabel = cfg.playersPerTeam === 1 ? 'Player 1 Name' : 'Team A Name';
        const nameBLabel = cfg.playersPerTeam === 1 ? 'Player 2 Name' : 'Team B Name';
        const buildRows = (prefix, team) => team.players.map(pl=>rowTpl(prefix, pl)).join('');
        return `
            <h3 class="font-bold text-lg mb-2">Edit ${label}</h3>
            <div class="flex gap-4 text-sm mb-4">
                <div class="flex-1 min-w-0">
                    <label class="block text-sm mb-1">${nameALabel}</label>
                    <input class="border p-1 w-full mb-2" id="team-a-name" value="${teamA.name}">
                    <div class="flex gap-2 mb-2">
                        <button id="a-show-start" class="control-button btn-xs">Starters</button>
                        <button id="a-show-bench" class="control-button btn-xs">Bench</button>
                        <button id="a-import" class="control-button btn-xs">Import CSV</button>
                        <button id="a-export" class="control-button btn-xs">Export CSV</button>
                        <input type="file" accept=".csv" id="a-csv" class="hidden">
                    </div>
                    <table class="w-full text-xs mb-2"><tbody id="a-body">${buildRows('a',teamA)}</tbody></table>
                </div>
                <div class="flex-1 min-w-0">
                    <label class="block text-sm mb-1">${nameBLabel}</label>
                    <input class="border p-1 w-full mb-2" id="team-b-name" value="${teamB.name}">
                    <div class="flex gap-2 mb-2">
                        <button id="b-show-start" class="control-button btn-xs">Starters</button>
                        <button id="b-show-bench" class="control-button btn-xs">Bench</button>
                        <button id="b-import" class="control-button btn-xs">Import CSV</button>
                        <button id="b-export" class="control-button btn-xs">Export CSV</button>
                        <input type="file" accept=".csv" id="b-csv" class="hidden">
                    </div>
                    <table class="w-full text-xs mb-2"><tbody id="b-body">${buildRows('b',teamB)}</tbody></table>
                </div>
            </div>
            <div class="flex gap-2 mt-4">
                <button id="teams-modal-save" class="control-button btn-sm">Save</button>
                <button id="teams-modal-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
            </div>`;
    }

    function setupEditHandlers(modal, win){
        const aIdx = tournament ? (currentData.currentA||0) : null;
        const bIdx = tournament ? (currentData.currentB||1) : null;
        const tA = tournament ? currentData.teams[aIdx] : currentData.teamA;
        const tB = tournament ? currentData.teams[bIdx] : currentData.teamB;
        const posOpts = cfg.positions.map(p=>`<option value="${p}">${p}</option>`).join('');

        function renderBody(prefix, team){
            const body = win.querySelector(`#${prefix}-body`);
            body.innerHTML = team.players.map(pl=>`
                <tr draggable="true" data-status="${pl.status}" data-prefix="${prefix}">
                    <td><input data-field="name" class="border p-1 w-full" value="${pl.name}"></td>
                    <td><input data-field="num" class="border p-1 w-12" value="${pl.number||''}"></td>
                    <td><select data-field="pos" class="border p-1 w-full"><option value=""></option>${posOpts}</select></td>
                    <td><select data-field="status" class="border p-1 w-full"><option value="starting">Starting</option><option value="sub">Sub</option><option value="not">Not playing</option></select></td>
                    <td><input data-field="photo" class="border p-1 w-full mb-1" placeholder="Photo URL" value="${pl.photo||''}"><input type="file" data-field="file" class="text-xs" accept="image/*"></td>
                </tr>`).join('');
            body.querySelectorAll('tr').forEach((tr,i)=>{
                const p = team.players[i];
                const posSel = tr.querySelector('select[data-field="pos"]');
                if(posSel) posSel.value = p.pos || '';
                const stSel = tr.querySelector('select[data-field="status"]');
                if(stSel) stSel.value = p.status || 'not';
                const fileInp = tr.querySelector('input[data-field="file"]');
                fileInp.addEventListener('change', async ()=>{
                    const file = fileInp.files[0];
                    if(file){
                        const path = `uploads/${eventId}/teams/${prefix}_${i}_${file.name}`;
                        const url = await uploadToServer(file, path);
                        if(url) tr.querySelector('input[data-field="photo"]').value = url;
                    }
                });
                tr.addEventListener('dragstart', e=>{ dragSrc = tr; e.dataTransfer.effectAllowed='move'; });
                tr.addEventListener('dragover', e=>{ e.preventDefault(); });
                tr.addEventListener('drop', e=>{
                    e.preventDefault();
                    if(dragSrc!==tr){
                        const tb = tr.parentNode;
                        const children = Array.from(tb.children);
                        const srcIdx = children.indexOf(dragSrc);
                        const destIdx = children.indexOf(tr);
                        if(srcIdx<destIdx) tb.insertBefore(dragSrc, tr.nextSibling); else tb.insertBefore(dragSrc, tr);
                    }
                });
                stSel.addEventListener('change', ()=>{ tr.dataset.status = stSel.value; });
            });
        }

        let dragSrc = null;
        renderBody('a', tA);
        renderBody('b', tB);

        function filterRows(prefix, status){
            const body = win.querySelector(`#${prefix}-body`);
            body.querySelectorAll('tr').forEach(tr=>{ tr.style.display = tr.dataset.status===status ? '' : 'none'; });
        }
        win.querySelector('#a-show-start').onclick = ()=>filterRows('a','starting');
        win.querySelector('#a-show-bench').onclick = ()=>filterRows('a','sub');
        win.querySelector('#b-show-start').onclick = ()=>filterRows('b','starting');
        win.querySelector('#b-show-bench').onclick = ()=>filterRows('b','sub');

        function getPlayers(prefix){
            return Array.from(win.querySelectorAll(`#${prefix}-body tr`)).map(tr=>({
                name: tr.querySelector('input[data-field="name"]').value,
                number: tr.querySelector('input[data-field="num"]').value,
                pos: tr.querySelector('select[data-field="pos"]').value,
                status: tr.querySelector('select[data-field="status"]').value,
                photo: tr.querySelector('input[data-field="photo"]').value
            }));
        }

        function importCsv(prefix, team){
            const inp = win.querySelector(`#${prefix}-csv`);
            inp.addEventListener('change', e=>{
                const file = e.target.files[0];
                if(!file) return;
                const reader = new FileReader();
                reader.onload = ev=>{
                    const lines = ev.target.result.split(/\r?\n/).filter(Boolean);
                    const players = lines.map(line=>{
                        const [name='',number='',pos='',status='starting',photo=''] = line.split(',');
                        return {name,number,pos,status,photo};
                    });
                    team.players = players.concat(team.players.slice(players.length));
                    renderBody(prefix, team);
                };
                reader.readAsText(file);
            });
        }
        importCsv('a', tA);
        importCsv('b', tB);

        function exportCsv(prefix){
            const players = getPlayers(prefix);
            const csv = players.map(p=>[p.name,p.number,p.pos,p.status,p.photo].join(',')).join('\n');
            const blob = new Blob([csv],{type:'text/csv'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${prefix}-squad.csv`;
            a.click();
            URL.revokeObjectURL(url);
        }
        win.querySelector('#a-import').onclick = ()=>win.querySelector('#a-csv').click();
        win.querySelector('#b-import').onclick = ()=>win.querySelector('#b-csv').click();
        win.querySelector('#a-export').onclick = ()=>exportCsv('a');
        win.querySelector('#b-export').onclick = ()=>exportCsv('b');

        win.querySelector('#teams-modal-cancel').onclick = ()=>{ modal.style.display='none'; };
        win.querySelector('#teams-modal-save').onclick = async ()=>{
            const aPlayers = getPlayers('a');
            const bPlayers = getPlayers('b');
            if(aPlayers.filter(p=>p.status==='starting').length !== cfg.playersPerTeam || bPlayers.filter(p=>p.status==='starting').length !== cfg.playersPerTeam){
                alert(`Each team must have exactly ${cfg.playersPerTeam} starting players.`);
                return;
            }
            let newData;
            if(tournament){
                const teams = currentData.teams.slice();
                teams[aIdx] = { ...tA, name: win.querySelector('#team-a-name').value, players: aPlayers };
                teams[bIdx] = { ...tB, name: win.querySelector('#team-b-name').value, players: bPlayers };
                newData = { ...currentData, teams };
            }else{
                newData = {
                    teamA: { ...tA, name: win.querySelector('#team-a-name').value, players: aPlayers },
                    teamB: { ...tB, name: win.querySelector('#team-b-name').value, players: bPlayers },
                    showPhotosFormation: currentData.showPhotosFormation,
                    showPhotosStats: currentData.showPhotosStats,
                    showPhotosSubs: currentData.showPhotosSubs
                };
            }
            await set(getTeamsRef(eventId), newData);
            modal.style.display='none';
        };
    }
}
