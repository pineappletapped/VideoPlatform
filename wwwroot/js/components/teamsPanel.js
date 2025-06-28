import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";

const db = getDatabaseInstance();

function getTeamsRef(eventId) {
    return ref(db, `teams/${eventId}`);
}

export function renderTeamsPanel(container, eventId) {
    onValue(getTeamsRef(eventId), (snap) => {
        const data = snap.val() || { teamA: { name: 'Team A', players: [] }, teamB: { name: 'Team B', players: [] } };
        render(data);
    });

    function render(data) {
        container.innerHTML = `
            <div class='teams-panel'>
                <h2 class="font-bold text-lg mb-2">Teams</h2>
                <div class="flex gap-4 mb-4">
                    <div class="flex-1">
                        <input class="border p-1 w-full mb-2" id="team-a-name" value="${data.teamA.name}" />
                        <textarea id="team-a-list" class="border p-1 w-full" rows="6" placeholder="Name - Position">${data.teamA.players.map(p=>`${p.name} - ${p.pos}`).join('\n')}</textarea>
                    </div>
                    <div class="flex-1">
                        <input class="border p-1 w-full mb-2" id="team-b-name" value="${data.teamB.name}" />
                        <textarea id="team-b-list" class="border p-1 w-full" rows="6" placeholder="Name - Position">${data.teamB.players.map(p=>`${p.name} - ${p.pos}`).join('\n')}</textarea>
                    </div>
                </div>
                <button id="teams-save" class="control-button btn-sm">Save</button>
            </div>
        `;
        container.querySelector('#teams-save').onclick = async () => {
            const teamAPlayers = container.querySelector('#team-a-list').value.split('\n').filter(Boolean).map(l=>{
                const [n,p=''] = l.split('-').map(s=>s.trim());
                return { name:n, pos:p };
            });
            const teamBPlayers = container.querySelector('#team-b-list').value.split('\n').filter(Boolean).map(l=>{
                const [n,p=''] = l.split('-').map(s=>s.trim());
                return { name:n, pos:p };
            });
            const newData = {
                teamA: { name: container.querySelector('#team-a-name').value, players: teamAPlayers },
                teamB: { name: container.querySelector('#team-b-name').value, players: teamBPlayers }
            };
            await set(getTeamsRef(eventId), newData);
        };
    }
}
