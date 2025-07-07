import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { updateOverlayState, listenOverlayState } from '../firebase.js';
import { getDatabaseInstance } from '../firebaseApp.js';

const db = getDatabaseInstance();

function getStatsRef(eventId) {
    return ref(db, `stats/${eventId}`);
}

export function renderStatsPanel(container, eventId = 'demo', mode = 'edit') {
    let teamsData = null;
    let stats = [];
    let visible = false;
    let preview = false;

    onValue(ref(db, `teams/${eventId}`), snap => { teamsData = snap.val(); render(); });
    onValue(getStatsRef(eventId), snap => { stats = snap.val() || []; render(); });
    listenOverlayState(eventId, state => { visible = !!(state && state.statVisible); preview = !!(state && state.statPreviewVisible); render(); });

    async function saveStats(list) {
        await set(getStatsRef(eventId), list);
    }

    function teamOptions() {
        if (!teamsData) return '<option value="">None</option>';
        return `<option value="">None</option><option value="teamA">${teamsData.teamA?.name || 'Team A'}</option><option value="teamB">${teamsData.teamB?.name || 'Team B'}</option>`;
    }

    function playerOptions(teamKey) {
        if (!teamKey || !teamsData || !teamsData[teamKey]) return '<option value="">None</option>';
        const opts = teamsData[teamKey].players || [];
        return ['<option value="">None</option>', ...opts.map(p => `<option value="${p.name}">${p.name}</option>`)].join('');
    }

    function render() {
        if (!teamsData) { container.innerHTML = '<div class="text-gray-500">Loading...</div>'; return; }
        const highlight = visible ? 'ring-4 ring-green-400' : preview ? 'ring-4 ring-brand' : '';
        container.innerHTML = `
            <div class='stats-panel ${highlight}'>
                <h2 class="font-bold text-lg mb-2 flex items-center justify-between">
                    <span>Stats</span>
                    ${mode === 'edit' ? '<button id="stat-add" class="control-button btn-sm">Add</button>' : ''}
                </h2>
                <ul class="space-y-2 mb-4">
                    ${stats.length === 0 ? `<li class='text-gray-400'>No stats yet.</li>` : stats.map((st,i)=>`
                        <li class="flex items-center gap-2 bg-gray-50 rounded p-2">
                            <span class="flex-1">${st.fact}${st.player?` - ${st.player}`:''}${st.team?` (${teamsData[st.team]?.name||st.team})`:''}</span>
                            <button class="control-button btn-sm" data-action="preview" data-idx="${i}">Preview</button>
                            <button class="control-button btn-sm" data-action="live" data-idx="${i}">Live</button>
                            ${mode==='edit'?`<button class="control-button btn-sm" data-action="edit" data-idx="${i}">Edit</button><button class="control-button btn-sm" data-action="remove" data-idx="${i}">Remove</button>`:''}
                        </li>
                    `).join('')}
                </ul>
                <button id="stat-hide" class="control-button btn-sm">Hide</button>
                <div id="stat-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 id="stat-modal-title" class="font-bold text-lg mb-2">Add Stat</h3>
                        <form id="stat-form">
                            <div class="mb-2">
                                <label class="block text-sm">Fact</label>
                                <textarea name="fact" class="border p-1 w-full" rows="2" required></textarea>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Team</label>
                                <select name="team" id="stat-team" class="border p-1 w-full">${teamOptions()}</select>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Player</label>
                                <select name="player" id="stat-player" class="border p-1 w-full"></select>
                            </div>
                            <input type="hidden" name="idx" />
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="stat-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        const playerSel = container.querySelector('#stat-player');
        const teamSel = container.querySelector('#stat-team');
        if (teamSel && playerSel) {
            const fill = () => { playerSel.innerHTML = playerOptions(teamSel.value); };
            fill();
            teamSel.onchange = fill;
        }

        if (mode === 'edit') {
            container.querySelector('#stat-add').onclick = () => showModal();
        }
        container.querySelectorAll('button[data-action]').forEach(btn => {
            const idx = parseInt(btn.getAttribute('data-idx'));
            const act = btn.getAttribute('data-action');
            if (act === 'preview') btn.onclick = () => { updateOverlayState(eventId, { stat: stats[idx], statPreviewVisible: true, statVisible: false }); };
            if (act === 'live') btn.onclick = () => { updateOverlayState(eventId, { stat: stats[idx], statVisible: true, statPreviewVisible: false }); };
            if (act === 'edit') btn.onclick = () => showModal(stats[idx], idx);
            if (act === 'remove') btn.onclick = async () => { stats.splice(idx,1); await saveStats(stats); };
        });
        const hideBtn = container.querySelector('#stat-hide');
        if (hideBtn) hideBtn.onclick = () => updateOverlayState(eventId,{ statVisible:false, statPreviewVisible:false });

        const modal = container.querySelector('#stat-modal');
        const form = container.querySelector('#stat-form');
        if (modal && form) {
            container.querySelector('#stat-cancel').onclick = () => { modal.style.display='none'; };
            form.onsubmit = async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                const stat = { fact:data.fact, team:data.team||'', player:data.player||'' };
                if (data.idx) stats[data.idx] = stat; else stats.push(stat);
                await saveStats(stats);
                modal.style.display = 'none';
            };
        }
    }

    function showModal(stat={}, idx='') {
        const modal = container.querySelector('#stat-modal');
        const form = container.querySelector('#stat-form');
        if (!modal || !form) return;
        form.fact.value = stat.fact || '';
        form.team.value = stat.team || '';
        const playerSel = form.querySelector('[name="player"]');
        playerSel.innerHTML = playerOptions(form.team.value);
        playerSel.value = stat.player || '';
        form.idx.value = idx;
        container.querySelector('#stat-modal-title').textContent = idx===''?'Add Stat':'Edit Stat';
        modal.style.display = 'flex';
    }
}
