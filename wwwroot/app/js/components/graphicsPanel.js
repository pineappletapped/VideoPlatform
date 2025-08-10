import { setGraphicsData, updateGraphicsData, getGraphicsData, listenGraphicsData, listenFavorites, updateFavorites, addMatchLog, listenOverlayState, listenTeams, setTeams, updateOverlayState } from '../firebase.js';
import { sportsData } from '../sportsConfig.js';

const transitions = [
    { value: 'cut', label: 'Cut' },
    { value: 'fade', label: 'Fade' },
    { value: 'slide-left', label: 'Slide Left' },
    { value: 'slide-right', label: 'Slide Right' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'slide-down', label: 'Slide Down' }
];

const BASE_LOG_EVENTS = ['Goal','Substitution'];
function getLogEventsForSport(sp){
    return sportsData[sp]?.logEvents || BASE_LOG_EVENTS;
}
function formatEventLabel(e){
    return e.replace(/\b\w/g, c => c.toUpperCase());
}

let liveLowerThirdId = null;
let previewLowerThirdId = null;
let liveTitleSlideId = null;
let previewTitleSlideId = null;
let graphicsData = { lowerThirds: [], titleSlides: [], teams: {}, categories: [] };
let favorites = { lowerThirds: [], titleSlides: [], scoreboard: false, stingers: [], shortcuts: {}, sponsors: [] };
let overlayState = {};

function saveLiveState(eventId, mode) {
    // Only update visibility IDs so preview actions don't overwrite graphics data
    updateGraphicsData(eventId, {
        liveLowerThirdId,
        previewLowerThirdId,
        liveTitleSlideId,
        previewTitleSlideId
    }, mode);
}

function saveGraphicsData(eventId, graphics, mode) {
    graphicsData = { ...graphicsData, ...graphics };
    setGraphicsData(eventId, {
        ...graphicsData,
        liveLowerThirdId,
        previewLowerThirdId,
        liveTitleSlideId,
        previewTitleSlideId
    }, mode);
}

export function renderGraphicsPanel(container, eventData, mode = 'live') {
    const eventId = eventData.id || 'demo';
    const eventType = eventData.eventType || 'corporate';
    const sportsMode = eventType === 'sports';
    const awardsMode = eventType === 'awards';
    let teamsData = null;
    let logEvents = [];
    let teamsBaseId = eventId;

    if (sportsMode) {
        listenTeams(eventId, (data, baseId)=>{ teamsBaseId = baseId; teamsData = data; renderPanel(); });
        logEvents = getLogEventsForSport(eventData.sport);
    }
    // Listen for graphics changes from Firebase
    listenGraphicsData(eventId, (data) => {
        if (!data && eventData.graphics) {
            graphicsData = { ...(eventData.graphics || {}) };
            setGraphicsData(eventId, graphicsData, mode);
        } else {
            graphicsData = { lowerThirds: [], titleSlides: [], teams: {}, categories: [], ...(data || {}) };
        }
        liveLowerThirdId = graphicsData.liveLowerThirdId || null;
        previewLowerThirdId = graphicsData.previewLowerThirdId || null;
        liveTitleSlideId = graphicsData.liveTitleSlideId || null;
        previewTitleSlideId = graphicsData.previewTitleSlideId || null;
        renderPanel();
    }, mode);
    listenFavorites(eventId, (fav) => { favorites = { lowerThirds: [], titleSlides: [], scoreboard: false, stingers: [], shortcuts: {}, sponsors: [], ...(fav || {}) }; renderPanel(); });
    listenOverlayState(eventId, state => { overlayState = state || {}; });

    function renderPanel() {
        const lowerThirds = graphicsData.lowerThirds || [];
        const titleSlides = graphicsData.titleSlides || [];
        const categories = graphicsData.categories || [];
        // Modal HTML (hidden by default)
        const modalHtml = `
            <div id="graphics-modal" class="modal-overlay" style="display:none;">
                <div class="modal-window">
                    <h3 id="modal-title" class="font-bold text-lg mb-2">Add/Edit</h3>
                    <form id="modal-form">
                        <input id="modal-id" type="hidden" />
                        <div class="mb-2">
                            <label class="block text-sm">Title</label>
                            <input id="modal-title-input" class="border p-1 w-full" required />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Subtitle</label>
                            <input id="modal-subtitle-input" class="border p-1 w-full" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Style</label>
                            <select id="modal-style-input" class="border p-1 w-full">
                                <option value="default">Default</option>
                                <option value="rounded">Rounded</option>
                                <option value="underline">Underline</option>
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Position</label>
                            <select id="modal-position-input" class="border p-1 w-full">
                                <option value="bottom-left">Bottom Left</option>
                                <option value="bottom-right">Bottom Right</option>
                                <option value="top-left">Top Left</option>
                                <option value="top-right">Top Right</option>
                                <option value="custom">Custom</option>
                            </select>
                            <button type="button" id="modal-pos-default" class="control-button btn-sm mt-1">Default</button>
                            <div id="custom-pos" class="mt-2" style="display:none;">
                                <div class="flex gap-2">
                                    <input id="modal-pos-x" type="number" class="border p-1 w-full" placeholder="X" />
                                    <input id="modal-pos-y" type="number" class="border p-1 w-full" placeholder="Y" />
                                </div>
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Transition In</label>
                            <select id="modal-trans-in" class="border p-1 w-full">
                                ${transitions.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Transition Out</label>
                            <select id="modal-trans-out" class="border p-1 w-full">
                                ${transitions.map(t=>`<option value="${t.value}">${t.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="modal-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.innerHTML = `
            <div class='graphics-panel'>
                <h2 class="font-bold text-lg mb-2">Graphics Panel</h2>
                <div class="mb-2">
                    <div class="flex items-center justify-between mb-1">
                        <strong>Lower Thirds:</strong>
                        <button class="control-button btn-sm" id="add-lt">Add</button>
                    </div>
                    <table class="w-full text-sm">
                        <tbody>
                            ${lowerThirds.length === 0 ? `<tr><td class='text-gray-400'>No lower thirds yet.</td></tr>` : lowerThirds.map(lt => `
                                <tr data-id="${lt.id}" class="${liveLowerThirdId === lt.id ? 'bg-yellow-200' : previewLowerThirdId === lt.id ? 'ring-2 ring-brand' : ''}">
                                    <td class="pr-2 py-1">${lt.title} <span class="text-xs text-gray-500">(${lt.subtitle})</span></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-preview" data-action="preview-lt" data-id="${lt.id}">Preview</button></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-live" data-action="take-lt" data-id="${lt.id}">Live</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="edit-lt" data-id="${lt.id}">Edit</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="favorite-lt" data-id="${lt.id}">${favorites.lowerThirds.includes(lt.id) ? '★' : '☆'}</button></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-remove" data-action="remove-lt" data-id="${lt.id}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <strong>Title Slides:</strong>
                        <button class="control-button btn-sm" id="add-ts">Add</button>
                    </div>
                    <table class="w-full text-sm">
                        <tbody>
                            ${titleSlides.length === 0 ? `<tr><td class='text-gray-400'>No title slides yet.</td></tr>` : titleSlides.map(ts => `
                                <tr data-id="${ts.id}" class="${liveTitleSlideId === ts.id ? 'bg-yellow-200' : previewTitleSlideId === ts.id ? 'ring-2 ring-brand' : ''}">
                                    <td class="pr-2 py-1">${ts.title} <span class="text-xs text-gray-500">(${ts.subtitle})</span></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-preview" data-action="preview-ts" data-id="${ts.id}">Preview</button></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-live" data-action="take-ts" data-id="${ts.id}">Live</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="edit-ts" data-id="${ts.id}">Edit</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="favorite-ts" data-id="${ts.id}">${favorites.titleSlides.includes(ts.id) ? '★' : '☆'}</button></td>
                                    <td class="py-1"><button class="control-button btn-sm btn-remove" data-action="remove-ts" data-id="${ts.id}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ${awardsMode ? `
                <div class="mt-4">
                    <div class="flex items-center justify-between mb-1">
                        <strong>Awards Categories:</strong>
                        <button class="control-button btn-sm" id="add-cat">Add</button>
                    </div>
                    <table class="w-full text-sm">
                        <tbody>
                            ${categories.length === 0 ? `<tr><td class='text-gray-400'>No categories yet.</td></tr>` : categories.map(cat => `
                                <tr data-id="${cat.id}">
                                    <td class="pr-2 py-1">${cat.title}</td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="preview-cat" data-id="${cat.id}">Preview Category</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="live-cat" data-id="${cat.id}">Live Category</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="preview-nom" data-id="${cat.id}">Preview Nominees</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="live-nom" data-id="${cat.id}">Live Nominees</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="preview-runner" data-id="${cat.id}">Preview Runner Up</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="live-runner" data-id="${cat.id}">Live Runner Up</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="preview-win" data-id="${cat.id}">Preview Winner</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="live-win" data-id="${cat.id}">Live Winner</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="preview-montage" data-id="${cat.id}">Preview Montage</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="live-montage" data-id="${cat.id}">Live Montage</button></td>
                                    <td class="py-1"><button class="control-button btn-xs" data-action="edit-cat" data-id="${cat.id}">Edit</button></td>
                                    <td class="py-1"><button class="control-button btn-xs btn-remove" data-action="remove-cat" data-id="${cat.id}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                ` : ''}
                ${teamsData ? `
                <div class="mt-4">
                    <strong>In Game Events:</strong>
                    <div class="flex gap-2 mt-1 text-sm items-center">
                        <select id="ige-type" class="border p-1 flex-1">
                            ${logEvents.map(e=>`<option value="${e}">${formatEventLabel(e)}</option>`).join('')}
                        </select>
                        <select id="ige-team" class="border p-1">
                            ${['teamA','teamB'].map(k=>`<option value="${k}">${teamsData[k]?.name || k}</option>`).join('')}
                        </select>
                        <select id="ige-player" class="border p-1 flex-1"></select>
                        <select id="ige-player-on" class="border p-1 flex-1" style="display:none;"></select>
                        <button id="ige-add" class="control-button btn-sm">Add</button>
                    </div>
                </div>
                ` : ''}
                ${modalHtml}
            </div>
        `;
        // Modal logic
        const modal = container.querySelector('#graphics-modal');
        const form = container.querySelector('#modal-form');
        const titleInput = container.querySelector('#modal-title-input');
        const subtitleInput = container.querySelector('#modal-subtitle-input');
        const styleInput = container.querySelector('#modal-style-input');
        const posInput = container.querySelector('#modal-position-input');
        const transInInput = container.querySelector('#modal-trans-in');
        const transOutInput = container.querySelector('#modal-trans-out');
        const posX = container.querySelector('#modal-pos-x');
        const posY = container.querySelector('#modal-pos-y');
        const customWrap = container.querySelector('#custom-pos');
        const idInput = container.querySelector('#modal-id');
        const posDefault = container.querySelector('#modal-pos-default');
        const modalTitle = container.querySelector('#modal-title');
        if (modal) {
            container.querySelector('#modal-cancel').onclick = () => { modal.style.display = 'none'; };
            if (posDefault) {
                posDefault.onclick = () => {
                    posInput.value = 'bottom-left';
                    customWrap.style.display = 'none';
                };
            }
            posInput.onchange = () => {
                customWrap.style.display = posInput.value === 'custom' ? 'block' : 'none';
            };
            form.onsubmit = e => {
                e.preventDefault();
                const isLT = modalTitle.textContent.includes('Lower Third');
                const arr = isLT ? lowerThirds : titleSlides;
                const id = idInput.value || (Date.now() + Math.random()).toString(36);
                const idx = arr.findIndex(x => x.id === id);
                let position = posInput.value;
                if (position === 'custom') {
                    const x = parseInt(posX.value || '0', 10);
                    const y = parseInt(posY.value || '0', 10);
                    position = `custom:${x},${y}`;
                }
                const obj = { id, title: titleInput.value, subtitle: subtitleInput.value, style: styleInput.value, position, transitionIn: transInInput.value, transitionOut: transOutInput.value };
                if (idx >= 0) {
                    arr[idx] = obj;
                } else {
                    arr.push(obj);
                }
                saveGraphicsData(eventId, { lowerThirds, titleSlides }, mode);
                modal.style.display = 'none';
            };
        }
        // Add handlers
        container.querySelector('#add-lt').onclick = () => {
            modalTitle.textContent = 'Add Lower Third';
            titleInput.value = '';
            subtitleInput.value = '';
            styleInput.value = 'default';
            posInput.value = 'bottom-left';
            transInInput.value = 'fade';
            transOutInput.value = 'fade';
            customWrap.style.display = 'none';
            idInput.value = '';
            modal.style.display = 'flex';
        };
        container.querySelector('#add-ts').onclick = () => {
            modalTitle.textContent = 'Add Title Slide';
            titleInput.value = '';
            subtitleInput.value = '';
            styleInput.value = 'default';
            posInput.value = 'bottom-left';
            transInInput.value = 'fade';
            transOutInput.value = 'fade';
            customWrap.style.display = 'none';
            idInput.value = '';
            modal.style.display = 'flex';
        };
        if (awardsMode) {
            const addBtn = container.querySelector('#add-cat');
            if(addBtn) addBtn.onclick = () => {
                const title = prompt('Category title?');
                if(!title) return;
                const nominees = (prompt('Nominees (comma separated)?')||'').split(',').map(s=>s.trim()).filter(Boolean);
                const runnerUp = prompt('Runner Up?')||'';
                const winner = prompt('Winner?')||'';
                const montage = prompt('Winner montage URL?')||'';
                const id = (Date.now()+Math.random()).toString(36);
                categories.push({ id, title, nominees, runnerUp, winner, montage });
                saveGraphicsData(eventId,{ categories }, mode);
            };
            container.addEventListener('click', e=>{
                const action = e.target.getAttribute('data-action');
                const id = e.target.getAttribute('data-id');
                if(!action || !id) return;
                const idx = categories.findIndex(c=>c.id===id);
                if(idx<0) return;
                const cat = categories[idx];
                if(action==='edit-cat'){
                    const title = prompt('Category title?', cat.title)||cat.title;
                    const nominees = (prompt('Nominees (comma separated)?', (cat.nominees||[]).join(', '))||'').split(',').map(s=>s.trim()).filter(Boolean);
                    const runnerUp = prompt('Runner Up?', cat.runnerUp||'')||'';
                    const winner = prompt('Winner?', cat.winner||'')||'';
                    const montage = prompt('Winner montage URL?', cat.montage||'')||'';
                    categories[idx] = { id:cat.id, title, nominees, runnerUp, winner, montage };
                    saveGraphicsData(eventId,{ categories }, mode);
                } else if(action==='remove-cat'){
                    categories.splice(idx,1);
                    saveGraphicsData(eventId,{ categories }, mode);
                } else if(action==='preview-cat'){
                    updateOverlayState(eventId,{ awardsCategory:cat, categoryRevealPreviewVisible:true, categoryRevealVisible:false });
                } else if(action==='live-cat'){
                    updateOverlayState(eventId,{ awardsCategory:cat, categoryRevealVisible:true, categoryRevealPreviewVisible:false });
                } else if(action==='preview-nom'){
                    updateOverlayState(eventId,{ awardsCategory:cat, categoryNomineesPreviewVisible:true, categoryNomineesVisible:false });
                } else if(action==='live-nom'){
                    updateOverlayState(eventId,{ awardsCategory:cat, categoryNomineesVisible:true, categoryNomineesPreviewVisible:false });
                } else if(action==='preview-runner'){
                    updateOverlayState(eventId,{ awardsCategory:cat, runnerUpPreviewVisible:true, runnerUpVisible:false });
                } else if(action==='live-runner'){
                    updateOverlayState(eventId,{ awardsCategory:cat, runnerUpVisible:true, runnerUpPreviewVisible:false });
                } else if(action==='preview-win'){
                    updateOverlayState(eventId,{ awardsCategory:cat, winnerAnnouncementPreviewVisible:true, winnerAnnouncementVisible:false });
                } else if(action==='live-win'){
                    updateOverlayState(eventId,{ awardsCategory:cat, winnerAnnouncementVisible:true, winnerAnnouncementPreviewVisible:false });
                } else if(action==='preview-montage'){
                    updateOverlayState(eventId,{ awardsCategory:cat, winnerMontagePreviewVisible:true, winnerMontageVisible:false });
                } else if(action==='live-montage'){
                    updateOverlayState(eventId,{ awardsCategory:cat, winnerMontageVisible:true, winnerMontagePreviewVisible:false });
                }
            });
        }
        if (teamsData) {
            const typeSel = container.querySelector('#ige-type');
            const teamSel = container.querySelector('#ige-team');
            const playerSel = container.querySelector('#ige-player');
            const playerOnSel = container.querySelector('#ige-player-on');

            const fillPlayers = () => {
                const teamKey = teamSel.value;
                const team = teamsData[teamKey];
                const starters = (team?.players || []).filter(p=>(p.status||'starting')==='starting').map(p=>p.name);
                const subs = (team?.players || []).filter(p=>p.status==='sub').map(p=>p.name);
                const offOpts = ['<option value=""></option>', ...starters.map(p=>`<option value="${p}">${p}</option>`)];
                const onOpts = ['<option value=""></option>', ...subs.map(p=>`<option value="${p}">${p}</option>`)];
                playerSel.innerHTML = offOpts.join('');
                playerOnSel.innerHTML = onOpts.join('');
            };
            const updateType = () => {
                playerOnSel.style.display = typeSel.value.toLowerCase() === 'substitution' ? '' : 'none';
            };
            teamSel.onchange = fillPlayers;
            typeSel.onchange = updateType;
            fillPlayers();
            updateType();

            container.querySelector('#ige-add').onclick = async () => {
                const type = typeSel.value;
                const teamKey = teamSel.value;
                const teamName = teamsData[teamKey]?.name || '';
                const off = playerSel.value;
                const on = playerOnSel.value;
                let subtitle = '';
                let playerField = '';
                let playerName = '';
                let playerNumber = '';
                if (type.toLowerCase() === 'substitution') {
                    subtitle = `${off} → ${on}`;
                    playerField = subtitle;
                    playerName = off;
                    const offObj = teamsData[teamKey]?.players.find(p=>p.name===off);
                    playerNumber = offObj?.number || '';
                } else {
                    subtitle = off;
                    playerField = off;
                    const plObj = teamsData[teamKey]?.players.find(p=>p.name===off);
                    playerName = plObj?.name || off;
                    playerNumber = plObj?.number || '';
                }
                const sb = overlayState.scoreboard || {};
                const parseTime = str => { const [m = '0', s = '0'] = str.split(':'); return parseInt(m) * 60 + parseInt(s); };
                const formatTime = secs => `${Math.floor(secs/60)}:${(Math.abs(secs)%60).toString().padStart(2,'0')}`;
                let secs = parseTime(sb.time || '0:00');
                if(sb.timerRunning && sb.timerStart){
                    const elapsed = Math.floor((Date.now()-sb.timerStart)/1000);
                    secs = sb.timeDirection === 'down' ? Math.max(0,(sb.timerBase||0) - elapsed) : (sb.timerBase||0) + elapsed;
                }
                const timeStr = formatTime(secs);
                const logEntry = { ts: Date.now(), type, team: teamKey==='teamA'?'a':'b', player: playerField, playerName, playerNumber, time: timeStr };
                await addMatchLog(eventId, logEntry);
                if(type.toLowerCase() === 'substitution'){
                    const teamObj = teamsData[teamKey];
                    const offIdx = teamObj.players.findIndex(p=>p.name===off);
                    const onIdx = teamObj.players.findIndex(p=>p.name===on);
                    if(offIdx >= 0) teamObj.players[offIdx].status = 'sub';
                    if(onIdx >= 0) teamObj.players[onIdx].status = 'starting';
                    await setTeams(teamsBaseId, teamsData);
                    fillPlayers();
                }
                const obj = {
                    id: (Date.now()+Math.random()).toString(36),
                    title: `${teamName} ${type.charAt(0).toUpperCase()+type.slice(1)}`,
                    subtitle,
                    style: 'default',
                    position: 'bottom-left',
                    transitionIn: 'fade',
                    transitionOut: 'fade'
                };
                lowerThirds.push(obj);
                saveGraphicsData(eventId,{ lowerThirds, titleSlides }, mode);
            };
        }
        // Row button handlers
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.onclick = e => {
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                if (action === 'preview-lt') {
                    if (previewLowerThirdId === id) {
                        previewLowerThirdId = null;
                    } else {
                        previewLowerThirdId = id;
                    }
                    saveLiveState(eventId, mode);
                } else if (action === 'take-lt') {
                    if (liveLowerThirdId === id) {
                        liveLowerThirdId = null;
                    } else {
                        liveLowerThirdId = id;
                        previewLowerThirdId = null;
                    }
                    saveLiveState(eventId, mode);
                } else if (action === 'preview-ts') {
                    if (previewTitleSlideId === id) {
                        previewTitleSlideId = null;
                    } else {
                        previewTitleSlideId = id;
                    }
                    saveLiveState(eventId, mode);
                } else if (action === 'take-ts') {
                    if (liveTitleSlideId === id) {
                        liveTitleSlideId = null;
                    } else {
                        liveTitleSlideId = id;
                        previewTitleSlideId = null;
                    }
                    saveLiveState(eventId, mode);
                } else if (action === 'edit-lt' || action === 'edit-ts') {
                const item = (action === 'edit-lt' ? lowerThirds : titleSlides).find(x => x.id === id);
                modalTitle.textContent = action === 'edit-lt' ? 'Edit Lower Third' : 'Edit Title Slide';
                titleInput.value = item?.title || '';
                subtitleInput.value = item?.subtitle || '';
                styleInput.value = item?.style || 'default';
                const pos = item?.position || 'bottom-left';
                posInput.value = pos.startsWith('custom') ? 'custom' : pos;
                if (pos.startsWith('custom')) {
                    const [x,y] = pos.split(':')[1].split(',');
                    posX.value = x;
                    posY.value = y;
                    customWrap.style.display = 'block';
                } else {
                    customWrap.style.display = 'none';
                    posX.value = '';
                    posY.value = '';
                }
                transInInput.value = item?.transitionIn || 'fade';
                transOutInput.value = item?.transitionOut || 'fade';
                idInput.value = id;
                modal.style.display = 'flex';
                } else if (action === 'favorite-lt') {
                    const idx = favorites.lowerThirds.indexOf(id);
                    if (idx >= 0) favorites.lowerThirds.splice(idx,1); else favorites.lowerThirds.push(id);
                    if(favorites.shortcuts){
                        Object.keys(favorites.shortcuts).forEach(k=>{ const sc=favorites.shortcuts[k]; if(sc.type==='lowerThird' && sc.id===id) delete favorites.shortcuts[k]; });
                    }
                    updateFavorites(eventId, favorites);
                    renderPanel();
                } else if (action === 'favorite-ts') {
                    const idx = favorites.titleSlides.indexOf(id);
                    if (idx >= 0) favorites.titleSlides.splice(idx,1); else favorites.titleSlides.push(id);
                    if(favorites.shortcuts){
                        Object.keys(favorites.shortcuts).forEach(k=>{ const sc=favorites.shortcuts[k]; if(sc.type==='titleSlide' && sc.id===id) delete favorites.shortcuts[k]; });
                    }
                    updateFavorites(eventId, favorites);
                    renderPanel();
                } else if (action === 'remove-lt') {
                    const idx = lowerThirds.findIndex(x => x.id === id);
                    if (idx >= 0) lowerThirds.splice(idx, 1);
                    if (liveLowerThirdId === id) liveLowerThirdId = null;
                    if (previewLowerThirdId === id) previewLowerThirdId = null;
                    saveGraphicsData(eventId, { lowerThirds, titleSlides }, mode);
                } else if (action === 'remove-ts') {
                    const idx = titleSlides.findIndex(x => x.id === id);
                    if (idx >= 0) titleSlides.splice(idx, 1);
                    if (liveTitleSlideId === id) liveTitleSlideId = null;
                    if (previewTitleSlideId === id) previewTitleSlideId = null;
                    saveGraphicsData(eventId, { lowerThirds, titleSlides }, mode);
                }
            };
        });
    }
}