import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { updateOverlayState } from "../firebase.js";

const db = getDatabaseInstance();

function getGolfRef(eventId){
    return ref(db, `golf/${eventId}`);
}

export function renderGolfPanel(container, eventId){
    let data = null;
    onValue(getGolfRef(eventId), snap=>{ data = snap.val() || defaultData(); render(); });

    function defaultData(){
        return {
            course:{ name:'', logo:'', holes:Array.from({length:18}).map(()=>({par:4,distance:0,notes:''})) },
            players:[{ name:'Player 1', total:0, thru:0, today:0 }]
        };
    }

    async function save(){
        await set(getGolfRef(eventId), data);
        await updateOverlayState(eventId, { scoreboard: { golf:data } });
    }

    function render(){
        if(!data) return;
        const holesRows = data.course.holes.map((h,i)=>`<tr><td>${i+1}</td><td><input id="par-${i}" type="number" class="border p-1 w-12" value="${h.par}"></td><td><input id="dist-${i}" type="number" class="border p-1 w-16" value="${h.distance}"></td><td><input id="note-${i}" class="border p-1 w-full" value="${h.notes||''}"></td></tr>`).join('');
        const playerRows = data.players.map((p,i)=>`<tr><td><input id="name-${i}" class="border p-1 w-full" value="${p.name}"></td><td><input id="total-${i}" type="number" class="border p-1 w-16" value="${p.total}"></td><td><input id="thru-${i}" type="number" class="border p-1 w-12" value="${p.thru}"></td><td><input id="today-${i}" type="number" class="border p-1 w-12" value="${p.today}"></td><td><button class="control-button btn-xs" id="open-${i}">Open</button></td></tr>`).join('');
        container.innerHTML = `
            <div class='scoreboard-panel'>
                <h2 class="font-bold text-lg mb-2">Golf Leaderboard</h2>
                <div class="mb-2"><label class="text-sm">Course Name</label><input id="course-name" class="border p-1 w-full" value="${data.course.name}"></div>
                <div class="mb-2"><label class="text-sm">Course Logo URL</label><input id="course-logo" class="border p-1 w-full" value="${data.course.logo}"></div>
                <table class="w-full text-sm mb-4"><thead><tr><th>Hole</th><th>Par</th><th>Dist</th><th>Notes</th></tr></thead><tbody>${holesRows}</tbody></table>
                <h3 class="font-semibold mb-1">Players</h3>
                <table class="w-full text-sm mb-2" id="players"><thead><tr><th>Name</th><th>Total</th><th>Thru</th><th>Today</th><th></th></tr></thead><tbody>${playerRows}</tbody></table>
                <button id="add-player" class="control-button btn-xs mb-2">Add Player</button>
                <div class="flex gap-2 mb-2">
                    <button id="prev" class="control-button btn-sm">Preview</button>
                    <button id="live" class="control-button btn-sm">Live</button>
                    <button id="hide" class="control-button btn-sm">Hide</button>
                    <button id="save" class="control-button btn-sm ml-auto">Save</button>
                </div>
            </div>`;
        data.players.forEach((p,i)=>{
            container.querySelector(`#open-${i}`).onclick = ()=>window.open(`golf_player.html?event_id=${eventId}&player=${i}`,'_blank');
        });
        container.querySelector('#add-player').onclick = ()=>{data.players.push({name:`Player ${data.players.length+1}`, total:0, thru:0, today:0}); render();};
        container.querySelector('#save').onclick = async ()=>{
            data.course.name = container.querySelector('#course-name').value;
            data.course.logo = container.querySelector('#course-logo').value;
            data.course.holes.forEach((h,i)=>{
                h.par = parseInt(container.querySelector(`#par-${i}`).value)||4;
                h.distance = parseInt(container.querySelector(`#dist-${i}`).value)||0;
                h.notes = container.querySelector(`#note-${i}`).value;
            });
            data.players.forEach((p,i)=>{
                p.name = container.querySelector(`#name-${i}`).value;
                p.total = parseInt(container.querySelector(`#total-${i}`).value)||0;
                p.thru = parseInt(container.querySelector(`#thru-${i}`).value)||0;
                p.today = parseInt(container.querySelector(`#today-${i}`).value)||0;
            });
            await save();
        };
        container.querySelector('#prev').onclick = async ()=>{ await save(); await updateOverlayState(eventId,{scoreboardPreviewVisible:true}); };
        container.querySelector('#live').onclick = async ()=>{ await save(); await updateOverlayState(eventId,{scoreboardVisible:true,scoreboardPreviewVisible:false}); };
        container.querySelector('#hide').onclick = async ()=>{ await updateOverlayState(eventId,{scoreboardVisible:false,scoreboardPreviewVisible:false}); };
    }
}
