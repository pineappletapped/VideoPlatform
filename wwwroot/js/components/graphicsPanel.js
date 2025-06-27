import { setGraphicsData, getGraphicsData, listenGraphicsData } from '../firebase.js';

let liveLowerThirdId = null;
let liveTitleSlideId = null;
let graphicsData = null;

function saveLiveState(eventId) {
    setGraphicsData(eventId, {
        ...graphicsData,
        liveLowerThirdId,
        liveTitleSlideId
    });
}

function saveGraphicsData(eventId, graphics) {
    graphicsData = graphics;
    setGraphicsData(eventId, {
        ...graphics,
        liveLowerThirdId,
        liveTitleSlideId
    });
}

export function renderGraphicsPanel(container, eventData) {
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
        graphicsData = data || { lowerThirds: [], titleSlides: [] };
        liveLowerThirdId = graphicsData.liveLowerThirdId || null;
        liveTitleSlideId = graphicsData.liveTitleSlideId || null;
        renderPanel();
    });

    function renderPanel() {
        const lowerThirds = graphicsData.lowerThirds || [];
        const titleSlides = graphicsData.titleSlides || [];
        // Modal HTML (hidden by default)
        const modalHtml = `
            <div id="graphics-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
                <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:300px;max-width:90vw;">
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
                            </select>
                            <button type="button" id="modal-pos-default" class="control-button btn-sm mt-1">Default</button>
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
                    <strong>Lower Thirds:</strong>
                    <button class="control-button btn-sm" id="add-lt">Add</button>
                    <ul class="list-disc ml-5 mt-2">
                        ${lowerThirds.length === 0 ? `<li class='text-gray-400'>No lower thirds yet.</li>` : lowerThirds.map(lt => `
                            <li data-id="${lt.id}" class="graphics-row${liveLowerThirdId === lt.id ? ' bg-yellow-200' : ''}" style="padding:0.5rem 0;">
                                <span>${lt.title} <span class="text-xs text-gray-500">(${lt.subtitle})</span></span>
                                <button class="control-button btn-sm" data-action="edit-lt" data-id="${lt.id}">Edit</button>
                                <button class="control-button btn-sm" data-action="remove-lt" data-id="${lt.id}">Remove</button>
                                <button class="control-button btn-sm" data-action="show-lt" data-id="${lt.id}">Show</button>
                                <button class="control-button btn-sm" data-action="hide-lt" data-id="${lt.id}">Hide</button>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div>
                    <strong>Title Slides:</strong>
                    <button class="control-button btn-sm" id="add-ts">Add</button>
                    <ul class="list-disc ml-5 mt-2">
                        ${titleSlides.length === 0 ? `<li class='text-gray-400'>No title slides yet.</li>` : titleSlides.map(ts => `
                            <li data-id="${ts.id}" class="graphics-row${liveTitleSlideId === ts.id ? ' bg-yellow-200' : ''}" style="padding:0.5rem 0;">
                                <span>${ts.title} <span class="text-xs text-gray-500">(${ts.subtitle})</span></span>
                                <button class="control-button btn-sm" data-action="edit-ts" data-id="${ts.id}">Edit</button>
                                <button class="control-button btn-sm" data-action="remove-ts" data-id="${ts.id}">Remove</button>
                                <button class="control-button btn-sm" data-action="show-ts" data-id="${ts.id}">Show</button>
                                <button class="control-button btn-sm" data-action="hide-ts" data-id="${ts.id}">Hide</button>
                            </li>
                        `).join('')}
                    </ul>
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
        const idInput = container.querySelector('#modal-id');
        const posDefault = container.querySelector('#modal-pos-default');
        const modalTitle = container.querySelector('#modal-title');
        if (modal) {
            container.querySelector('#modal-cancel').onclick = () => { modal.style.display = 'none'; };
            if (posDefault) posDefault.onclick = () => { posInput.value = 'bottom-left'; };
            form.onsubmit = e => {
                e.preventDefault();
                const isLT = modalTitle.textContent.includes('Lower Third');
                const arr = isLT ? lowerThirds : titleSlides;
                const id = idInput.value || (Date.now() + Math.random()).toString(36);
                const idx = arr.findIndex(x => x.id === id);
                const obj = { id, title: titleInput.value, subtitle: subtitleInput.value, style: styleInput.value, position: posInput.value };
                if (idx >= 0) {
                    arr[idx] = obj;
                } else {
                    arr.push(obj);
                }
                saveGraphicsData(eventId, { lowerThirds, titleSlides });
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
            idInput.value = '';
            modal.style.display = 'flex';
        };
        container.querySelector('#add-ts').onclick = () => {
            modalTitle.textContent = 'Add Title Slide';
            titleInput.value = '';
            subtitleInput.value = '';
            styleInput.value = 'default';
            posInput.value = 'bottom-left';
            idInput.value = '';
            modal.style.display = 'flex';
        };
        // Row button handlers
        container.querySelectorAll('button[data-action]').forEach(btn => {
            btn.onclick = e => {
                const action = btn.getAttribute('data-action');
                const id = btn.getAttribute('data-id');
                if (action === 'show-lt') {
                    liveLowerThirdId = id;
                    saveLiveState(eventId);
                } else if (action === 'hide-lt') {
                    liveLowerThirdId = null;
                    saveLiveState(eventId);
                } else if (action === 'show-ts') {
                    liveTitleSlideId = id;
                    saveLiveState(eventId);
                } else if (action === 'hide-ts') {
                    liveTitleSlideId = null;
                    saveLiveState(eventId);
                } else if (action === 'edit-lt' || action === 'edit-ts') {
                const item = (action === 'edit-lt' ? lowerThirds : titleSlides).find(x => x.id === id);
                modalTitle.textContent = action === 'edit-lt' ? 'Edit Lower Third' : 'Edit Title Slide';
                titleInput.value = item?.title || '';
                subtitleInput.value = item?.subtitle || '';
                styleInput.value = item?.style || 'default';
                posInput.value = item?.position || 'bottom-left';
                idInput.value = id;
                modal.style.display = 'flex';
                } else if (action === 'remove-lt') {
                    const idx = lowerThirds.findIndex(x => x.id === id);
                    if (idx >= 0) lowerThirds.splice(idx, 1);
                    if (liveLowerThirdId === id) liveLowerThirdId = null;
                    saveGraphicsData(eventId, { lowerThirds, titleSlides });
                } else if (action === 'remove-ts') {
                    const idx = titleSlides.findIndex(x => x.id === id);
                    if (idx >= 0) titleSlides.splice(idx, 1);
                    if (liveTitleSlideId === id) liveTitleSlideId = null;
                    saveGraphicsData(eventId, { lowerThirds, titleSlides });
                }
            };
        });
    }
}