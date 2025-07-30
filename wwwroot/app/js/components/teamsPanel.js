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

export function renderTeamsPanel(container, eventId, sport = 'Football', tournament = false) {
    const cfg = sportsData[sport] || sportsData['Football'];

    onValue(getTeamsRef(eventId), (snap) => {
        const data = snap.val() || defaultData();
        render(data);
    });

    function defaultData() {
        const playerSlots = cfg.playersPerTeam + (cfg.subs || 0);
        const players = Array.from({ length: playerSlots }).map(() => ({ name: '', pos: '', photo: '' }));
        if (!tournament) {
            return {
                teamA: { name: 'Team A', abbrev: suggestAbbreviation('Team A'), logo: '', color: '#ffffff', players: players.slice() },
                teamB: { name: 'Team B', abbrev: suggestAbbreviation('Team B'), logo: '', color: '#ffffff', players: players.slice() },
                showPhotosFormation: false,
                showPhotosStats: false,
                showPhotosSubs: false
            };
        } else {
            return {
                teams: [
                    { name: 'Team 1', abbrev: 'T1', logo: '', color: '#ffffff', players: players.slice() },
                    { name: 'Team 2', abbrev: 'T2', logo: '', color: '#ffffff', players: players.slice() }
                ],
                currentA: 0,
                currentB: 1,
                showPhotosFormation: false,
                showPhotosStats: false,
                showPhotosSubs: false
            };
        }
    }

    function render(data) {
        const posOpts = cfg.positions.map(p=>`<option value="${p}">${p}</option>`).join('');
        const playerRows = (prefix, team) => team.players.map((pl,idx)=>`
            <tr>
                <td><input class="border p-1 w-full" id="${prefix}-name-${idx}" value="${pl.name}"></td>
                <td><select class="border p-1 w-full" id="${prefix}-pos-${idx}"><option value=""></option>${posOpts}</select></td>
                <td>
                    <div class="flex items-center gap-1 mb-1">
                        <input type="file" id="${prefix}-photo-file-${idx}" accept="image/*" class="text-xs" />
                        <button type="button" id="${prefix}-upload-${idx}" class="control-button btn-xs">Upload</button>
                    </div>
                    <input class="border p-1 w-full" id="${prefix}-photo-${idx}" placeholder="Photo URL" value="${pl.photo || ''}" />
                </td>
            </tr>`).join('');
        if (!tournament) {
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
        } else {
            const teamOptions = data.teams.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('');
            const editSel = `<select id="edit-team" class="border p-1 flex-1 mb-2">${teamOptions}</select>`;
            container.innerHTML = `
                <div class='teams-panel'>
                    <h2 class="font-bold text-lg mb-2">Teams</h2>
                    <div class="flex gap-2 mb-4 text-sm">
                        <label>Team A</label>
                        <select id="select-a" class="border p-1 flex-1">${teamOptions}</select>
                        <label class="ml-2">Team B</label>
                        <select id="select-b" class="border p-1 flex-1">${teamOptions}</select>
                    </div>
                    <div class="flex items-center gap-2 mb-2">${editSel}<button id="add-team" class="control-button btn-xs">Add Team</button></div>
                    <div id="edit-area"></div>
                    <div class="flex gap-4 text-sm mb-4">
                        <label class="inline-flex items-center"><input type="checkbox" id="show-formation" class="mr-1" ${data.showPhotosFormation ? 'checked' : ''}>Photos on Formation</label>
                        <label class="inline-flex items-center"><input type="checkbox" id="show-stats" class="mr-1" ${data.showPhotosStats ? 'checked' : ''}>Photos on Stats</label>
                        <label class="inline-flex items-center"><input type="checkbox" id="show-subs" class="mr-1" ${data.showPhotosSubs ? 'checked' : ''}>Photos on Subs</label>
                    </div>
                    <button id="teams-save" class="control-button btn-sm">Save</button>
                </div>`;

            const editArea = container.querySelector('#edit-area');
            const editSelect = container.querySelector('#edit-team');
            function renderEdit(idx){
                const team = data.teams[idx];
                const rows = playerRows(`t${idx}`, team);
                editArea.innerHTML = `
                    <div class="border p-2 mb-2">
                        <input class="border p-1 w-full mb-2" id="team-name-${idx}" value="${team.name}" />
                        <input class="border p-1 w-full mb-2" id="team-abbrev-${idx}" value="${team.abbrev || suggestAbbreviation(team.name)}" placeholder="Abbrev" />
                        <div class="flex items-center gap-2 mb-1"><input type="file" id="team-logo-file-${idx}" accept="image/*" /><button type="button" id="team-logo-upload-${idx}" class="control-button btn-xs">Upload</button></div>
                        <input class="border p-1 w-full mb-2" id="team-logo-${idx}" placeholder="Logo URL" value="${team.logo || ''}" />
                        <div class="mb-2"><label class="text-xs">Colour</label><input type="color" id="team-color-${idx}" class="border p-1 w-full" value="${team.color || '#ffffff'}"></div>
                        <table class="w-full text-xs"><tbody>${rows}</tbody></table>
                    </div>`;
                team.players.forEach((pl,j)=>{ const sel=editArea.querySelector(`#t${idx}-pos-${j}`); if(sel) sel.value=pl.pos; });
            }
            renderEdit(data.currentA || 0);
            editSelect.value = data.currentA || 0;
            editSelect.onchange = () => renderEdit(parseInt(editSelect.value));
            container.querySelector('#add-team').onclick = () => {
                const playerSlots = cfg.playersPerTeam + (cfg.subs || 0);
                const players = Array.from({length:playerSlots}).map(()=>({name:'',pos:'',photo:''}));
                data.teams.push({ name:`Team ${data.teams.length+1}`, abbrev:`T${data.teams.length+1}`, logo:'', color:'#ffffff', players });
                render(data);
            };
        }
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
        container.querySelector('#team-b-upload')?.addEventListener('click', async () => {
            const file = container.querySelector('#team-b-logo-file').files[0];
            if (file) {
                const path = `uploads/${eventId}/teams/teamB_${file.name}`;
                const url = await uploadToServer(file, path);
                if (url) container.querySelector('#team-b-logo').value = url;
            }
        });
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
            const getPlayers = prefix => Array.from({length: playerSlots}).map((_,i)=>({
                name: container.querySelector(`#${prefix}-name-${i}`).value,
                pos: container.querySelector(`#${prefix}-pos-${i}`).value,
                photo: container.querySelector(`#${prefix}-photo-${i}`).value
            }));
            let newData;
            if (!tournament) {
                newData = {
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
            } else {
                newData = {
                    teams: data.teams.map((t,idx)=>({
                        name: container.querySelector(`#team-name-${idx}`).value,
                        abbrev: container.querySelector(`#team-abbrev-${idx}`).value.toUpperCase().slice(0,3),
                        logo: container.querySelector(`#team-logo-${idx}`).value,
                        color: container.querySelector(`#team-color-${idx}`).value,
                        players: getPlayers(`t${idx}`)
                    })),
                    currentA: parseInt(container.querySelector('#select-a').value) || 0,
                    currentB: parseInt(container.querySelector('#select-b').value) || 1
                };
            }
            newData.showPhotosFormation = container.querySelector('#show-formation').checked;
            newData.showPhotosStats = container.querySelector('#show-stats').checked;
            newData.showPhotosSubs = container.querySelector('#show-subs').checked;
            await set(getTeamsRef(eventId), newData);
        };
    }
}
