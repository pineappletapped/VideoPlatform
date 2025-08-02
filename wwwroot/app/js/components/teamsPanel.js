import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
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
    onValue(getTeamsRef(eventId), snap=>{ currentData = snap.val() || defaultData(); renderList(); });

    function defaultData(){
        const count = cfg.playersPerTeam + (cfg.subs||0);
        const players = Array.from({length:count}).map(()=>({name:'',pos:'',photo:''}));
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
        const list = team=>team.players.map(pl=>`<li class="flex justify-between border-b border-gray-700 py-1"><span>${pl.name}</span><span class="text-xs text-gray-400">${pl.pos}${photoIcon(pl.photo)}</span></li>`).join('');
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
        const rows = (prefix, team)=>team.players.map((pl,idx)=>`<tr><td><input class="border p-1 w-full" id="${prefix}-name-${idx}" value="${pl.name}"></td><td><select class="border p-1 w-full" id="${prefix}-pos-${idx}"><option value=""></option>${posOpts}</select></td><td><input class="border p-1 w-full mb-1" id="${prefix}-photo-${idx}" placeholder="Photo URL" value="${pl.photo||''}"><input type="file" id="${prefix}-file-${idx}" class="text-xs" accept="image/*"></td></tr>`).join('');
        const nameALabel = cfg.playersPerTeam === 1 ? 'Player 1 Name' : 'Team A Name';
        const nameBLabel = cfg.playersPerTeam === 1 ? 'Player 2 Name' : 'Team B Name';
        return `
            <h3 class="font-bold text-lg mb-2">Edit ${label}</h3>
            <div class="flex gap-4 text-sm mb-4">
                <div class="flex-1 min-w-0">
                    <label class="block text-sm mb-1">${nameALabel}</label>
                    <input class="border p-1 w-full mb-2" id="team-a-name" value="${teamA.name}">
                    <table class="w-full text-xs mb-2"><tbody>${rows('a', teamA)}</tbody></table>
                </div>
                <div class="flex-1 min-w-0">
                    <label class="block text-sm mb-1">${nameBLabel}</label>
                    <input class="border p-1 w-full mb-2" id="team-b-name" value="${teamB.name}">
                    <table class="w-full text-xs mb-2"><tbody>${rows('b', teamB)}</tbody></table>
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
        tA.players.forEach((pl,i)=>{ const sel=win.querySelector(`#a-pos-${i}`); if(sel) sel.value=pl.pos; });
        tB.players.forEach((pl,i)=>{ const sel=win.querySelector(`#b-pos-${i}`); if(sel) sel.value=pl.pos; });
        win.querySelectorAll('input[type="file"]').forEach(inp=>{
            inp.addEventListener('change', async ()=>{
                const [teamKey,,idx] = inp.id.split('-');
                const file = inp.files[0];
                if(file){
                    const path = `uploads/${eventId}/teams/${teamKey}_${idx}_${file.name}`;
                    const url = await uploadToServer(file, path);
                    if(url) win.querySelector(`#${teamKey}-photo-${idx}`).value = url;
                }
            });
        });
        win.querySelector('#teams-modal-cancel').onclick = ()=>{ modal.style.display='none'; };
        win.querySelector('#teams-modal-save').onclick = async ()=>{
            const slots = cfg.playersPerTeam + (cfg.subs||0);
            const getPlayers = prefix => Array.from({length:slots}).map((_,i)=>({
                name: win.querySelector(`#${prefix}-name-${i}`).value,
                pos: win.querySelector(`#${prefix}-pos-${i}`).value,
                photo: win.querySelector(`#${prefix}-photo-${i}`).value
            }));
            let newData;
            if(tournament){
                const teams = currentData.teams.slice();
                teams[aIdx] = { ...tA, name: win.querySelector('#team-a-name').value, players: getPlayers('a') };
                teams[bIdx] = { ...tB, name: win.querySelector('#team-b-name').value, players: getPlayers('b') };
                newData = { ...currentData, teams };
            }else{
                newData = {
                    teamA: { ...tA, name: win.querySelector('#team-a-name').value, players: getPlayers('a') },
                    teamB: { ...tB, name: win.querySelector('#team-b-name').value, players: getPlayers('b') },
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
