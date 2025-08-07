import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { updateOverlayState, listenOverlayState, listenTeams } from "../firebase.js";

const db = getDatabaseInstance();

function getLineupsRef(eventId){
    return ref(db, `lineups/${eventId}`);
}

export function renderLineupPanel(container, eventId = 'demo', sport = 'Football', mode = 'edit'){
    const cfg = sportsData[sport] || sportsData['Football'];
    let teamsData = null;
    let lineupData = null;
    let lineupsUpdated = 0;
    let formationVisible = false;
    let formationTeam = '';
    let tableVisible = false;
    let tableTeam = '';
    let resultsVisible = false;
    let scoreboardData = null;

    listenTeams(eventId, data=>{ teamsData = data; if(lineupData) render(); });
    onValue(getLineupsRef(eventId), snap=>{ lineupData = snap.val() || defaultData(); render(); });
    if(mode === 'view') {
        listenOverlayState(eventId, state => {
            lineupsUpdated = state && state.lineupsUpdated || 0;
            formationVisible = state && state.formationVisible || false;
            formationTeam = state && state.formation ? state.formation.team : '';
            tableVisible = state && state.lineupTableVisible || false;
            tableTeam = state && state.lineupTable ? state.lineupTable.team : '';
            resultsVisible = state && state.resultsVisible || false;
            scoreboardData = state && state.scoreboard || null;
            render();
        });
    }

    function defaultData(){
        return {
            teamA: { starters: [], formation: '4-4-2' },
            teamB: { starters: [], formation: '4-4-2' }
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
                            <div class="mt-2">
                                <label class="block text-xs">Formation</label>
                                <input id="form-a" class="border p-1 w-full" value="${lineupData.teamA.formation || ''}">
                            </div>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamB.name}</h3>
                            <table class="w-full"><tbody>${rowsEdit('b', teamsData.teamB, lineupData.teamB.starters)}</tbody></table>
                            <div class="mt-2">
                                <label class="block text-xs">Formation</label>
                                <input id="form-b" class="border p-1 w-full" value="${lineupData.teamB.formation || ''}">
                            </div>
                        </div>
                    </div>
                    <button id="lineups-save" class="control-button btn-sm mt-2">Save</button>
                </div>`;
            container.querySelector('#lineups-save').onclick = async ()=>{
                const startersA = teamsData.teamA.players.map((_,i)=> container.querySelector(`#a-start-${i}`).checked ? i : null).filter(i=>i!==null);
                const startersB = teamsData.teamB.players.map((_,i)=> container.querySelector(`#b-start-${i}`).checked ? i : null).filter(i=>i!==null);
                const formA = container.querySelector('#form-a').value || '';
                const formB = container.querySelector('#form-b').value || '';
                lineupData = { teamA:{ starters: startersA, formation: formA }, teamB:{ starters: startersB, formation: formB } };
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
                            <button id="show-a" class="control-button btn-sm mt-1${formationVisible && formationTeam==='a' ? ' ring-2 ring-green-400' : ''}">Formation</button>
                            <button id="table-a" class="control-button btn-sm mt-1${tableVisible && tableTeam==='a' ? ' ring-2 ring-green-400' : ''}">Table</button>
                        </div>
                        <div class="flex-1">
                            <h3 class="font-semibold mb-1">${teamsData.teamB.name}</h3>
                            ${rowsView(teamsData.teamB, lineupData.teamB.starters)}
                            <button id="show-b" class="control-button btn-sm mt-1${formationVisible && formationTeam==='b' ? ' ring-2 ring-green-400' : ''}">Formation</button>
                            <button id="table-b" class="control-button btn-sm mt-1${tableVisible && tableTeam==='b' ? ' ring-2 ring-green-400' : ''}">Table</button>
                        </div>
                    </div>
                    <div class="mt-2">
                        <button id="show-results" class="control-button btn-sm${resultsVisible ? ' ring-2 ring-green-400' : ''}">Match Result</button>
                    </div>
                </div>`;
            localStorage.setItem(`lineupsSeen-${eventId}`, String(lineupsUpdated));
            const showA = container.querySelector('#show-a');
            const showB = container.querySelector('#show-b');
            function buildFormation(teamKey){
                const lu = teamKey==='a' ? lineupData.teamA : lineupData.teamB;
                const team = teamKey==='a'
                    ? (teamsData.teams ? teamsData.teams[teamsData.currentA||0] : teamsData.teamA)
                    : (teamsData.teams ? teamsData.teams[teamsData.currentB||1] : teamsData.teamB);
                const nums = (lu.formation || '4-4-2').split('-').map(n=>parseInt(n.trim())).filter(n=>n>0);
                const players = lu.starters.map(i=>team.players[i]).filter(p=>p);
                const rows = [1,...nums];
                const step = 80/(rows.length-1);
                const startY = teamKey==='a'?90:10;
                const res=[]; let idx=0;
                rows.forEach((count,r)=>{
                    const y = teamKey==='a'? startY - r*step : startY + r*step;
                    for(let i=0;i<count;i++){
                        const x = (i+1)/(count+1)*100;
                        const pl = players[idx++] || {name:'',number:'',pos:'',photo:''};
                        res.push({name:pl.name,number:pl.number,pos:pl.pos,photo:pl.photo,x,y});
                    }
                });
                return {team:teamKey,players:res};
            }
            function buildTable(teamKey){
                const team = teamKey==='a'
                    ? (teamsData.teams ? teamsData.teams[teamsData.currentA||0] : teamsData.teamA)
                    : (teamsData.teams ? teamsData.teams[teamsData.currentB||1] : teamsData.teamB);
                return {team:teamKey, players: team.players.map(p=>({name:p.name,number:p.number,pos:p.pos,photo:p.photo}))};
            }
            function toggleFormation(teamKey){
                if(formationVisible && formationTeam===teamKey){
                    updateOverlayState(eventId,{formationVisible:false});
                }else{
                    updateOverlayState(eventId,{formation:buildFormation(teamKey),formationVisible:true});
                }
            }
            function toggleTableDisplay(teamKey){
                if(tableVisible && tableTeam===teamKey){
                    updateOverlayState(eventId,{lineupTableVisible:false});
                }else{
                    updateOverlayState(eventId,{lineupTable:buildTable(teamKey),lineupTableVisible:true});
                }
            }
            function toggleResults(){
                if(resultsVisible){
                    updateOverlayState(eventId,{resultsVisible:false});
                }else if(scoreboardData){
                    const tA = teamsData.teams ? teamsData.teams[teamsData.currentA||0] : teamsData.teamA;
                    const tB = teamsData.teams ? teamsData.teams[teamsData.currentB||1] : teamsData.teamB;
                    updateOverlayState(eventId,{results:{
                        teamA:{name:tA.name,score:scoreboardData.scores?.[0]||0,scorers:scoreboardData.scorers?.[0]||[]},
                        teamB:{name:tB.name,score:scoreboardData.scores?.[1]||0,scorers:scoreboardData.scorers?.[1]||[]}
                    },resultsVisible:true});
                }
            }
            if(showA) showA.onclick=()=>toggleFormation('a');
            if(showB) showB.onclick=()=>toggleFormation('b');
            const tableA = container.querySelector('#table-a');
            const tableB = container.querySelector('#table-b');
            const resBtn = container.querySelector('#show-results');
            if(tableA) tableA.onclick=()=>toggleTableDisplay('a');
            if(tableB) tableB.onclick=()=>toggleTableDisplay('b');
            if(resBtn) resBtn.onclick=toggleResults;
        }
    }
}

