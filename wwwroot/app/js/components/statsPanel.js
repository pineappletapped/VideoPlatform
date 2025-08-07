import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { listenMatchLog, updateOverlayState, listenOverlayState, getEventMetadata, listenTeams } from '../firebase.js';
import { getDatabaseInstance } from '../firebaseApp.js';

const db = getDatabaseInstance();

const SPORT_STAT_OPTIONS = {
    Football: [
        { key: 'corners', label: 'Corners', logType: 'Corner' },
        { key: 'fouls', label: 'Fouls', logType: 'Foul' },
        { key: 'yellow', label: 'Yellow Cards', logType: 'Yellow Card' },
        { key: 'red', label: 'Red Cards', logType: 'Red Card' }
    ]
};

export function renderStatsPanel(container, eventId = 'demo') {
    let teams = null;
    let logs = [];
    let sport = 'Football';
    let config = { included: [], style: 'standard', position: 'bottom-center', transition: 'fade-slide' };
    let visible = false;
    let preview = false;
    let psVisible = false;
    let psPreview = false;
    let psPlayer = '';
    let psFact = '';

    const configRef = ref(db, `matchStatsConfig/${eventId}`);

    listenTeams(eventId, data => { teams = data; render(); });
    listenMatchLog(eventId, data => { logs = data || []; render(); });
    listenOverlayState(eventId, state => {
        visible = !!(state && state.statVisible);
        preview = !!(state && state.statPreviewVisible);
        psVisible = !!(state && state.playerStatVisible);
        psPreview = !!(state && state.playerStatPreviewVisible);
        render();
    });

    getEventMetadata(eventId).then(meta => {
        sport = meta?.sport || 'Football';
        if (!SPORT_STAT_OPTIONS[sport]) sport = 'Football';
        onValue(configRef, snap => {
            const val = snap.val();
            if (val) config = {
                included: SPORT_STAT_OPTIONS[sport].map(o => o.key),
                style: 'standard',
                position: 'bottom-center',
                transition: 'fade-slide',
                ...val
            };
            else config = {
                included: SPORT_STAT_OPTIONS[sport].map(o => o.key),
                style: 'standard',
                position: 'bottom-center',
                transition: 'fade-slide'
            };
            render();
        });
        render();
    });

    async function saveConfig(cfg) {
        await set(configRef, cfg);
    }

    function calcRows() {
        const opts = SPORT_STAT_OPTIONS[sport] || [];
        const counts = {};
        opts.forEach(o => { counts[o.key] = { a: 0, b: 0 }; });
        logs.forEach(l => {
            const opt = opts.find(o => o.logType === l.type);
            if (opt && (l.team === 'a' || l.team === 'b')) {
                counts[opt.key][l.team] = (counts[opt.key][l.team] || 0) + 1;
            }
        });
        return opts
            .filter(o => config.included.includes(o.key))
            .map(o => ({ label: o.label, a: counts[o.key]?.a || 0, b: counts[o.key]?.b || 0 }));
    }

    function render() {
        if (!teams) { container.innerHTML = '<div class="text-gray-500">Loading...</div>'; return; }
        const rows = calcRows();
        const teamA = teams.teamA?.name || 'Team A';
        const teamB = teams.teamB?.name || 'Team B';
        const highlight = visible ? 'ring-4 ring-green-400' : preview ? 'ring-4 ring-brand' : '';
        const psHighlight = psVisible ? 'ring-4 ring-green-400' : psPreview ? 'ring-4 ring-brand' : '';
        container.innerHTML = `
            <div class='stats-panel ${highlight}'>
                <h2 class="font-bold text-lg mb-2 flex items-center justify-between">
                    <span>Match Stats</span>
                    <div class="space-x-2">
                        <button id="ms-edit" class="control-button btn-sm">Edit</button>
                        <button id="ms-preview" class="control-button btn-sm">Preview</button>
                        <button id="ms-live" class="control-button btn-sm">Live</button>
                        <button id="ms-hide" class="control-button btn-sm">Hide</button>
                    </div>
                </h2>
                <table class="w-full text-sm mb-2">
                    <thead><tr><th></th><th>${teamA}</th><th>${teamB}</th></tr></thead>
                    <tbody>
                        ${rows.length ? rows.map(r=>`<tr><td>${r.label}</td><td>${r.a}</td><td>${r.b}</td></tr>`).join('') : `<tr><td colspan="3" class="text-center text-gray-400">No stats selected</td></tr>`}
                    </tbody>
                </table>
                <div id="ms-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Select Stats</h3>
                        <form id="ms-form" class="space-y-1"></form>
                    </div>
                </div>
                <div class='player-stat mt-4 ${psHighlight}'>
                    <h3 class='font-bold text-md mb-2'>Player Stat / Fact</h3>
                    <div class='flex gap-2 mb-2'>
                        <input id='ps-player' class='border p-1 flex-1' placeholder='Player Name'>
                        <input id='ps-fact' class='border p-1 flex-1' placeholder='Stat or Fact'>
                    </div>
                    <div class='space-x-2'>
                        <button id='ps-preview' class='control-button btn-sm'>Preview</button>
                        <button id='ps-live' class='control-button btn-sm'>Live</button>
                        <button id='ps-hide' class='control-button btn-sm'>Hide</button>
                    </div>
                </div>
            </div>`;

        const editBtn = container.querySelector('#ms-edit');
        if (editBtn) editBtn.onclick = showModal;
        const previewBtn = container.querySelector('#ms-preview');
        if (previewBtn) previewBtn.onclick = () => {
            const rows = calcRows();
            updateOverlayState(eventId, {
                stat: { teamA, teamB, rows, style: config.style, position: config.position, transition: config.transition },
                statPreviewVisible: true,
                statVisible: false
            });
        };
        const liveBtn = container.querySelector('#ms-live');
        if (liveBtn) liveBtn.onclick = () => {
            const rows = calcRows();
            updateOverlayState(eventId, {
                stat: { teamA, teamB, rows, style: config.style, position: config.position, transition: config.transition },
                statVisible: true,
                statPreviewVisible: false
            });
        };
        const hideBtn = container.querySelector('#ms-hide');
        if (hideBtn) hideBtn.onclick = () => updateOverlayState(eventId, { statVisible: false, statPreviewVisible: false });

        // Player stat handlers
        const psPlayerInput = container.querySelector('#ps-player');
        const psFactInput = container.querySelector('#ps-fact');
        if (psPlayerInput) { psPlayerInput.value = psPlayer; psPlayerInput.oninput = e => psPlayer = e.target.value; }
        if (psFactInput) { psFactInput.value = psFact; psFactInput.oninput = e => psFact = e.target.value; }
        const psPreviewBtn = container.querySelector('#ps-preview');
        if (psPreviewBtn) psPreviewBtn.onclick = () => {
            updateOverlayState(eventId, { playerStat: { player: psPlayer, fact: psFact }, playerStatPreviewVisible: true, playerStatVisible: false });
        };
        const psLiveBtn = container.querySelector('#ps-live');
        if (psLiveBtn) psLiveBtn.onclick = () => {
            updateOverlayState(eventId, { playerStat: { player: psPlayer, fact: psFact }, playerStatVisible: true, playerStatPreviewVisible: false });
        };
        const psHideBtn = container.querySelector('#ps-hide');
        if (psHideBtn) psHideBtn.onclick = () => updateOverlayState(eventId, { playerStatVisible: false, playerStatPreviewVisible: false });

        const modal = container.querySelector('#ms-modal');
        if (modal) {
            modal.querySelector('#ms-form').innerHTML =
                (SPORT_STAT_OPTIONS[sport] || [])
                    .map(o => `
                        <label class="block text-sm">
                            <input type="checkbox" name="${o.key}" ${config.included.includes(o.key) ? 'checked' : ''}/> ${o.label}
                        </label>`)
                    .join('') +
                `<div class="mt-2">
                    <label class="block text-sm">Style</label>
                    <select name="style" class="border p-1 w-full">
                        <option value="standard" ${config.style==='standard'?'selected':''}>Standard</option>
                        <option value="minimal" ${config.style==='minimal'?'selected':''}>Minimal</option>
                    </select>
                </div>
                <div class="mt-2">
                    <label class="block text-sm">Position</label>
                    <select name="position" class="border p-1 w-full">
                        <option value="bottom-center" ${config.position==='bottom-center'?'selected':''}>Bottom Center</option>
                        <option value="top-center" ${config.position==='top-center'?'selected':''}>Top Center</option>
                        <option value="top-left" ${config.position==='top-left'?'selected':''}>Top Left</option>
                        <option value="top-right" ${config.position==='top-right'?'selected':''}>Top Right</option>
                        <option value="bottom-left" ${config.position==='bottom-left'?'selected':''}>Bottom Left</option>
                        <option value="bottom-right" ${config.position==='bottom-right'?'selected':''}>Bottom Right</option>
                    </select>
                </div>
                <div class="mt-2">
                    <label class="block text-sm">Transition</label>
                    <select name="transition" class="border p-1 w-full">
                        <option value="fade-slide" ${config.transition==='fade-slide'?'selected':''}>Fade & Slide</option>
                        <option value="none" ${config.transition==='none'?'selected':''}>None</option>
                    </select>
                </div>
                <div class="flex gap-2 mt-4">
                    <button type="submit" class="control-button btn-sm">Save</button>
                    <button type="button" id="ms-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                </div>`;
            const form = modal.querySelector('#ms-form');
            form.onsubmit = async e => {
                e.preventDefault();
                const included = Array.from(form.querySelectorAll('input[type="checkbox"]'))
                    .filter(ch=>ch.checked)
                    .map(ch=>ch.name);
                const style = form.style.value;
                const position = form.position.value;
                const transition = form.transition.value;
                await saveConfig({ included, style, position, transition });
                modal.style.display = 'none';
            };
            modal.querySelector('#ms-cancel').onclick = () => { modal.style.display='none'; };
        }
    }

    function showModal() {
        const modal = container.querySelector('#ms-modal');
        if (modal) modal.style.display = 'flex';
    }
}

