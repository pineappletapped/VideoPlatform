import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { updateOverlayState, listenOverlayState } from "../firebase.js";

const db = getDatabaseInstance();

function getLineupsRef(eventId){
    return ref(db, `lineups/${eventId}`);
}

export function renderLineupPanel(container, eventId = 'demo', sport = 'Football', mode = 'edit'){
    const cfg = sportsData[sport] || sportsData['Football'];
    let teamsData = null;
    let lineupData = null;
    let lineupsUpdated = 0;

    onValue(ref(db, `teams/${eventId}`), snap=>{ teamsData = snap.val(); if(lineupData) render(); });
    onValue(getLineupsRef(eventId), snap=>{ lineupData = snap.val() || defaultData(); render(); });
    if(mode === 'view') {
        listenOverlayState(eventId, state => { lineupsUpdated = state && state.lineupsUpdated || 0; render(); });
    }

    function defaultData(){
        return {
            teamA: { starters: [] },
            teamB: { starters: [] }
        };
    }

    function render(){
        if(!teamsData || !lineupData){ container.innerHTML = '<div class="text-gray-500">Loading...</div>'; return; }
        const rowsEdit = (teamKey, team, starters)=> team.players.map((pl,idx)=>`<tr><td class="pr-2">${pl.name}</td><td class="pr-2 text-xs text-gray-400">${pl.pos}</td><td><input type="checkbox" id="${teamKey}-start-${idx}" ${starters.includes(idx)?'checked':''}></td></tr>`).join('');
        const rowsView = (team, starters)=> starters.map(i=>`<div>${team.players[i]?.name || ''} <span class="text-xs text-gray-400">${team.players[i]?.pos||''}</span></div>`).join('');
        let highlight = '';
        if(mode==='view'){
            const seen = parseInt(localStorage.getItem(`lineupsSeen-${eventId}`)||'0');
            highlight = lineupsUpdated>seen ? 'ring-4 ring-brand' : '';
        }
        if(mode==='edit'){
            container.innerHTML = `
                <div class='lineup-panel'>
                    <h2 class="font-bold text-lg mb-2">Lineups</h2>
                    <div class="flex gap-4 text-sm">
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamA.name}</h3>
                            <table class="w-full"><tbody>${rowsEdit('a', teamsData.teamA, lineupData.teamA.starters)}</tbody></table>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamB.name}</h3>
                            <table class="w-full"><tbody>${rowsEdit('b', teamsData.teamB, lineupData.teamB.starters)}</tbody></table>
                        </div>
                    </div>
                    <button id="lineups-save" class="control-button btn-sm mt-2">Save</button>
                </div>`;
            container.querySelector('#lineups-save').onclick = async ()=>{
                const startersA = teamsData.teamA.players.map((_,i)=> container.querySelector(`#a-start-${i}`).checked ? i : null).filter(i=>i!==null);
                const startersB = teamsData.teamB.players.map((_,i)=> container.querySelector(`#b-start-${i}`).checked ? i : null).filter(i=>i!==null);
                lineupData = { teamA:{ starters: startersA }, teamB:{ starters: startersB } };
                await set(getLineupsRef(eventId), lineupData);
                await updateOverlayState(eventId, { lineupsUpdated: Date.now(), lineups: lineupData });
            };
        } else {
            container.innerHTML = `
                <div class='lineup-panel ${highlight}'>
                    <h2 class="font-bold text-lg mb-2">Lineups</h2>
                    <div class="flex gap-4 text-sm">
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamA.name}</h3>
                            ${rowsView(teamsData.teamA, lineupData.teamA.starters)}
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamB.name}</h3>
                            ${rowsView(teamsData.teamB, lineupData.teamB.starters)}
                        </div>
                    </div>
                </div>`;
            localStorage.setItem(`lineupsSeen-${eventId}`, String(lineupsUpdated));
        }
    }
}

