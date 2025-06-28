import { setGraphicsData, updateGraphicsData, getGraphicsData, listenGraphicsData, listenFavorites, updateFavorites } from '../firebase.js';

let liveLowerThirdId = null;
let previewLowerThirdId = null;
let liveTitleSlideId = null;
let previewTitleSlideId = null;
let graphicsData = null;
let favorites = { lowerThirds: [], titleSlides: [] };

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
    if (eventType === 'sports') {
        container.innerHTML = `
            <div class='graphics-panel flex flex-col items-center justify-center min-h-[200px] text-gray-500'>
                <h2 class="font-bold text-lg mb-2">Sports Graphics Coming Soon</h2>
                <ul class="list-disc ml-5 text-left">
                    <li>Scoreboard</li>
                    <li>Timer/Clock</li>
                    <li>Team Lineups</li>
                    <li>Player Stats</li>
                    <li>Match Info</li>
                    <li>Animated Transitions</li>
                </ul>
                <div class="mt-4 text-xs text-gray-400">(Switch to Corporate for current graphics options)</div>
            </div>
        `;
        return;
    }
    // Listen for graphics changes from Firebase
    listenGraphicsData(eventId, (data) => {
        if (!data && eventData.graphics) {
            graphicsData = { ...eventData.graphics };
            setGraphicsData(eventId, graphicsData, mode);
        } else {
            graphicsData = data || { lowerThirds: [], titleSlides: [], teams: {} };
        }
        liveLowerThirdId = graphicsData.liveLowerThirdId || null;
        previewLowerThirdId = graphicsData.previewLowerThirdId || null;
        liveTitleSlideId = graphicsData.liveTitleSlideId || null;
        previewTitleSlideId = graphicsData.previewTitleSlideId || null;
        renderPanel();
    }, mode);
    listenFavorites(eventId, (fav) => { favorites = fav || { lowerThirds: [], titleSlides: [] }; renderPanel(); });

    function renderPanel() {
        const lowerThirds = graphicsData.lowerThirds || [];
        const titleSlides = graphicsData.titleSlides || [];
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
                                    <td class="py-1"><button class="control-button btn-sm" data-action="hide-lt" data-id="${lt.id}">Hide</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="edit-lt" data-id="${lt.id}">Edit</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="favorite-lt" data-id="${lt.id}">${favorites.lowerThirds.includes(lt.id) ? '★' : '☆'}</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="remove-lt" data-id="${lt.id}">Remove</button></td>
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
                                    <td class="py-1"><button class="control-button btn-sm" data-action="hide-ts" data-id="${ts.id}">Hide</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="edit-ts" data-id="${ts.id}">Edit</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="favorite-ts" data-id="${ts.id}">${favorites.titleSlides.includes(ts.id) ? '★' : '☆'}</button></td>
                                    <td class="py-1"><button class="control-button btn-sm" data-action="remove-ts" data-id="${ts.id}">Remove</button></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
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
                const obj = { id, title: titleInput.value, subtitle: subtitleInput.value, style: styleInput.value, position };
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
            customWrap.style.display = 'none';
            idInput.value = '';
            modal.style.display = 'flex';
        };
        // Row button handlers
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.onclick = e => {
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                if (action === 'preview-lt') {
                    previewLowerThirdId = id;
                    saveLiveState(eventId, mode);
                } else if (action === 'take-lt') {
                    liveLowerThirdId = id;
                    previewLowerThirdId = null;
                    saveLiveState(eventId, mode);
                } else if (action === 'hide-lt') {
                    liveLowerThirdId = null;
                    previewLowerThirdId = null;
                    saveLiveState(eventId, mode);
                } else if (action === 'preview-ts') {
                    previewTitleSlideId = id;
                    saveLiveState(eventId, mode);
                } else if (action === 'take-ts') {
                    liveTitleSlideId = id;
                    previewTitleSlideId = null;
                    saveLiveState(eventId, mode);
                } else if (action === 'hide-ts') {
                    liveTitleSlideId = null;
                    previewTitleSlideId = null;
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
                idInput.value = id;
                modal.style.display = 'flex';
                } else if (action === 'favorite-lt') {
                    const idx = favorites.lowerThirds.indexOf(id);
                    if (idx >= 0) favorites.lowerThirds.splice(idx,1); else favorites.lowerThirds.push(id);
                    updateFavorites(eventId, favorites);
                } else if (action === 'favorite-ts') {
                    const idx = favorites.titleSlides.indexOf(id);
                    if (idx >= 0) favorites.titleSlides.splice(idx,1); else favorites.titleSlides.push(id);
                    updateFavorites(eventId, favorites);
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