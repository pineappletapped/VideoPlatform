import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";
import { sportsData } from "../sportsConfig.js";
import { suggestAbbreviation } from "../teamUtils.js";

const db = getDatabaseInstance();

function getTeamsRef(eventId) {
    return ref(db, `teams/${eventId}`);
}

async function uploadToServer(file, path) {
    try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', path.replace(/^\/+/, ''));
        const resp = await fetch('upload.php', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('upload failed');
        const data = await resp.json();
        return data.url;
    } catch (err) {
        console.error('Upload failed', err);
        return null;
    }
}

export function renderTeamsPanel(container, eventId, sport = 'Football') {
    const cfg = sportsData[sport] || sportsData['Football'];

    onValue(getTeamsRef(eventId), (snap) => {
        const data = snap.val() || defaultData();
        render(data);
    });

    function defaultData() {
        const playerSlots = cfg.playersPerTeam + (cfg.subs || 0);
        const players = Array.from({ length: playerSlots }).map(() => ({ name: '', pos: '', photo: '' }));
        return {
            teamA: { name: 'Team A', abbrev: suggestAbbreviation('Team A'), logo: '', color: '#ffffff', players: players.slice() },
            teamB: { name: 'Team B', abbrev: suggestAbbreviation('Team B'), logo: '', color: '#ffffff', players: players.slice() },
            showPhotosFormation: false,
            showPhotosStats: false,
            showPhotosSubs: false
        };
    }

    function render(data) {
        const posOpts = cfg.positions.map(p=>`<option value="${p}">${p}</option>`).join('');
        const playerRows = (teamKey, team) => team.players.map((pl,idx)=>`
            <tr>
                <td><input class="border p-1 w-full" id="${teamKey}-name-${idx}" value="${pl.name}"></td>
                <td><select class="border p-1 w-full" id="${teamKey}-pos-${idx}"><option value=""></option>${posOpts}</select></td>
                <td>
                    <div class="flex items-center gap-1 mb-1">
                        <input type="file" id="${teamKey}-photo-file-${idx}" accept="image/*" class="text-xs" />
                        <button type="button" id="${teamKey}-upload-${idx}" class="control-button btn-xs">Upload</button>
                    </div>
                    <input class="border p-1 w-full" id="${teamKey}-photo-${idx}" placeholder="Photo URL" value="${pl.photo || ''}" />
                </td>
            </tr>`).join('');
        container.innerHTML = `
            <div class='teams-panel'>
                <h2 class="font-bold text-lg mb-2">Teams</h2>
                <div class="flex gap-4 mb-4 text-sm">
                    <div class="flex-1">
                        <input class="border p-1 w-full mb-2" id="team-a-name" value="${data.teamA.name}" />
                        <input class="border p-1 w-full mb-2" id="team-a-abbrev" value="${data.teamA.abbrev || suggestAbbreviation(data.teamA.name)}" placeholder="Abbrev" />
                        <div class="flex items-center gap-2 mb-1"><input type="file" id="team-a-logo-file" accept="image/*" /><button type="button" id="team-a-upload" class="control-button btn-xs">Upload</button></div>
                        <input class="border p-1 w-full mb-2" id="team-a-logo" placeholder="Logo URL" value="${data.teamA.logo || ''}" />
                        <div class="mb-2"><label class="text-xs">Colour</label><input type="color" id="team-a-color" class="border p-1 w-full" value="${data.teamA.color || '#ffffff'}"></div>
                        <table class="w-full text-xs"><tbody>${playerRows('a', data.teamA)}</tbody></table>
                    </div>
                    <div class="flex-1">
                        <input class="border p-1 w-full mb-2" id="team-b-name" value="${data.teamB.name}" />
                        <input class="border p-1 w-full mb-2" id="team-b-abbrev" value="${data.teamB.abbrev || suggestAbbreviation(data.teamB.name)}" placeholder="Abbrev" />
                        <div class="flex items-center gap-2 mb-1"><input type="file" id="team-b-logo-file" accept="image/*" /><button type="button" id="team-b-upload" class="control-button btn-xs">Upload</button></div>
                        <input class="border p-1 w-full mb-2" id="team-b-logo" placeholder="Logo URL" value="${data.teamB.logo || ''}" />
                        <div class="mb-2"><label class="text-xs">Colour</label><input type="color" id="team-b-color" class="border p-1 w-full" value="${data.teamB.color || '#ffffff'}"></div>
                        <table class="w-full text-xs"><tbody>${playerRows('b', data.teamB)}</tbody></table>
                    </div>
                </div>
                <div class="flex gap-4 text-sm mb-4">
                    <label class="inline-flex items-center"><input type="checkbox" id="show-formation" class="mr-1" ${data.showPhotosFormation ? 'checked' : ''}>Photos on Formation</label>
                    <label class="inline-flex items-center"><input type="checkbox" id="show-stats" class="mr-1" ${data.showPhotosStats ? 'checked' : ''}>Photos on Stats</label>
                    <label class="inline-flex items-center"><input type="checkbox" id="show-subs" class="mr-1" ${data.showPhotosSubs ? 'checked' : ''}>Photos on Subs</label>
                </div>
                <button id="teams-save" class="control-button btn-sm">Save</button>
            </div>`;
        data.teamA.players.forEach((pl,idx)=>{ const sel=container.querySelector(`#a-pos-${idx}`); if(sel) sel.value=pl.pos; });
        data.teamB.players.forEach((pl,idx)=>{ const sel=container.querySelector(`#b-pos-${idx}`); if(sel) sel.value=pl.pos; });

        const nameAInput = container.querySelector('#team-a-name');
        const abbrAInput = container.querySelector('#team-a-abbrev');
        const nameBInput = container.querySelector('#team-b-name');
        const abbrBInput = container.querySelector('#team-b-abbrev');
        if (abbrAInput && !data.teamA.abbrev) abbrAInput.dataset.auto = 'true';
        if (abbrBInput && !data.teamB.abbrev) abbrBInput.dataset.auto = 'true';
        if (nameAInput && abbrAInput) {
            nameAInput.addEventListener('input', () => {
                if (abbrAInput.dataset.auto === 'true') abbrAInput.value = suggestAbbreviation(nameAInput.value);
            });
            abbrAInput.addEventListener('input', () => { abbrAInput.dataset.auto = 'false'; });
        }
        if (nameBInput && abbrBInput) {
            nameBInput.addEventListener('input', () => {
                if (abbrBInput.dataset.auto === 'true') abbrBInput.value = suggestAbbreviation(nameBInput.value);
            });
            abbrBInput.addEventListener('input', () => { abbrBInput.dataset.auto = 'false'; });
        }
        container.querySelector('#team-a-upload').onclick = async () => {
            const file = container.querySelector('#team-a-logo-file').files[0];
            if (file) {
                const path = `uploads/${eventId}/teams/teamA_${file.name}`;
                const url = await uploadToServer(file, path);
                if (url) container.querySelector('#team-a-logo').value = url;
            }
        };
        container.querySelector('#team-b-upload').onclick = async () => {
            const file = container.querySelector('#team-b-logo-file').files[0];
            if (file) {
                const path = `uploads/${eventId}/teams/teamB_${file.name}`;
                const url = await uploadToServer(file, path);
                if (url) container.querySelector('#team-b-logo').value = url;
            }
        };
        container.querySelectorAll('button[id$="-upload-"]').forEach(btn => {
            const parts = btn.id.split('-');
            if (parts.length === 3) return; // team logo buttons
            btn.onclick = async () => {
                const [teamKey,,idx] = btn.id.split('-');
                const file = container.querySelector(`#${teamKey}-photo-file-${idx}`).files[0];
                if (file) {
                    const path = `uploads/${eventId}/teams/${teamKey}_${idx}_${file.name}`;
                    const url = await uploadToServer(file, path);
                    if (url) container.querySelector(`#${teamKey}-photo-${idx}`).value = url;
                }
            };
        });
        container.querySelector('#teams-save').onclick = async () => {
            const playerSlots = cfg.playersPerTeam + (cfg.subs || 0);
            const getPlayers = (teamKey) => {
                return Array.from({length: playerSlots}).map((_,i)=>({
                    name: container.querySelector(`#${teamKey}-name-${i}`).value,
                    pos: container.querySelector(`#${teamKey}-pos-${i}`).value,
                    photo: container.querySelector(`#${teamKey}-photo-${i}`).value
                }));
            };
            const newData = {
                teamA: {
                    name: container.querySelector('#team-a-name').value,
                    abbrev: container.querySelector('#team-a-abbrev').value.toUpperCase().slice(0,3),
                    logo: container.querySelector('#team-a-logo').value,
                    color: container.querySelector('#team-a-color').value,
                    players: getPlayers('a')
                },
                teamB: {
                    name: container.querySelector('#team-b-name').value,
                    abbrev: container.querySelector('#team-b-abbrev').value.toUpperCase().slice(0,3),
                    logo: container.querySelector('#team-b-logo').value,
                    color: container.querySelector('#team-b-color').value,
                    players: getPlayers('b')
                }
            };
            newData.showPhotosFormation = container.querySelector('#show-formation').checked;
            newData.showPhotosStats = container.querySelector('#show-stats').checked;
            newData.showPhotosSubs = container.querySelector('#show-subs').checked;
            await set(getTeamsRef(eventId), newData);
        };
    }
}
