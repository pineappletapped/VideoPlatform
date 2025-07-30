import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "./firebaseApp.js";

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';
const playerIdx = parseInt(params.get('player') || '0');
const db = getDatabaseInstance();
const golfRef = ref(db, `golf/${eventId}`);
let data = null;

onValue(golfRef, snap => { data = snap.val(); render(); });

function render(){
    if(!data) return;
    const player = data.players && data.players[playerIdx];
    if(!player) return;
    document.getElementById('player-title').textContent = player.name;
    const holes = data.course.holes || [];
    const rows = holes.map((h,i)=>{
        const stroke = player.strokes ? player.strokes[i] || 0 : 0;
        const pen = player.penalties ? player.penalties[i] || 0 : 0;
        return `<tr><td>${i+1}</td><td>${h.par}</td><td><input type="number" id="s-${i}" class="border p-1 w-16" value="${stroke}"></td><td><input type="number" id="p-${i}" class="border p-1 w-12" value="${pen}"></td></tr>`;
    }).join('');
    document.getElementById('player-form').innerHTML = `
        <table class="w-full text-sm mb-4"><thead><tr><th>Hole</th><th>Par</th><th>Strokes</th><th>Pen</th></tr></thead><tbody>${rows}</tbody></table>
        <button id="save" class="control-button btn-sm">Save</button>`;
    document.getElementById('save').onclick = async ()=>{
        if(!player.strokes) player.strokes = Array(holes.length).fill(0);
        if(!player.penalties) player.penalties = Array(holes.length).fill(0);
        holes.forEach((_,i)=>{
            player.strokes[i] = parseInt(document.getElementById(`s-${i}`).value)||0;
            player.penalties[i] = parseInt(document.getElementById(`p-${i}`).value)||0;
        });
        player.total = player.strokes.reduce((a,b)=>a+b,0) + player.penalties.reduce((a,b)=>a+b,0);
        player.thru = holes.findIndex((_,i)=> (player.strokes[i]||0)>0)+1;
        await set(golfRef, data);
    };
}
