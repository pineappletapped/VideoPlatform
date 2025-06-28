import { updateOverlayState, listenOverlayState } from '../firebase.js';

let liveProgramVisible = false;
let programData = null;

function saveProgramData(eventId, program) {
    programData = program;
    updateOverlayState(eventId, { program });
}

function loadProgramData(eventId, fallback, callback) {
    listenOverlayState(eventId, (state) => {
        if (state && state.program) {
            callback(state.program, state.liveProgramVisible);
        } else {
            callback(fallback, false);
        }
    });
}

function saveLiveProgramVisible(eventId, visible) {
    liveProgramVisible = visible;
    updateOverlayState(eventId, { liveProgramVisible: visible });
}

export function renderProgramPreview(container, eventData, onOverlayStateChange) {
    const eventId = eventData.id || 'demo';
    loadProgramData(eventId, eventData.program, (loadedProgram, liveVisible) => {
        programData = loadedProgram;
        liveProgramVisible = liveVisible;
        // Modal HTML (hidden by default)
        const modalHtml = `
            <div id="program-modal" class="modal-overlay" style="display:none;">
                <div class="modal-window">
                    <h3 class="font-bold text-lg mb-2">Edit Program</h3>
                    <form id="program-form">
                        <div id="program-items">
                            ${programData.map((item, idx) => `
                                <div class="flex gap-2 mb-2 items-center">
                                    <input class="border p-1 w-16" name="time" value="${item.time}" required />
                                    <input class="border p-1 flex-1" name="title" value="${item.title}" required />
                                    <input class="border p-1 flex-1" name="presenter" value="${item.presenter}" required />
                                    <button type="button" class="control-button btn-sm" data-action="remove" data-idx="${idx}">Remove</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="control-button btn-sm" id="add-program-item">Add Line</button>
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="program-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.innerHTML = `
            <div class='program-preview'>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="font-bold text-lg">Program Preview</h2>
                    <div>
                        <button class="control-button btn-sm${liveProgramVisible ? ' ring-2 ring-green-400' : ''}" id="show-program">Show</button>
                        <button class="control-button btn-sm${!liveProgramVisible ? ' ring-2 ring-red-400' : ''}" id="hide-program">Hide</button>
                        <button class="control-button btn-sm" id="edit-program">Edit</button>
                    </div>
                </div>
                <table class="min-w-full text-sm">
                    <thead><tr><th class="text-left">Time</th><th class="text-left">Title</th><th class="text-left">Presenter</th></tr></thead>
                    <tbody>
                        ${programData.map(item => `
                            <tr>
                                <td class="pr-4">${item.time}</td>
                                <td class="pr-4">${item.title}</td>
                                <td>${item.presenter}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${modalHtml}
            </div>
        `;
        // Modal logic
        const modal = container.querySelector('#program-modal');
        const form = container.querySelector('#program-form');
        if (modal) {
            container.querySelector('#program-cancel').onclick = () => { modal.style.display = 'none'; };
            form.onsubmit = e => {
                e.preventDefault();
                // Gather new program data
                const items = Array.from(form.querySelectorAll('#program-items > div')).map(row => {
                    const inputs = row.querySelectorAll('input');
                    return {
                        time: inputs[0].value,
                        title: inputs[1].value,
                        presenter: inputs[2].value
                    };
                });
                saveProgramData(eventId, items);
                modal.style.display = 'none';
                renderProgramPreview(container, eventData, onOverlayStateChange);
                if (onOverlayStateChange) onOverlayStateChange({ program: items });
            };
            // Remove line
            form.querySelectorAll('button[data-action="remove"]').forEach(btn => {
                btn.onclick = () => {
                    const idx = parseInt(btn.getAttribute('data-idx'), 10);
                    programData.splice(idx, 1);
                    saveProgramData(eventId, programData);
                    renderProgramPreview(container, eventData, onOverlayStateChange);
                    // Reopen modal
                    setTimeout(() => { modal.style.display = 'flex'; }, 10);
                    if (onOverlayStateChange) onOverlayStateChange({ program: programData });
                };
            });
            // Add line
            container.querySelector('#add-program-item').onclick = () => {
                programData.push({ time: '', title: '', presenter: '' });
                saveProgramData(eventId, programData);
                renderProgramPreview(container, eventData, onOverlayStateChange);
                // Reopen modal
                setTimeout(() => { modal.style.display = 'flex'; }, 10);
                if (onOverlayStateChange) onOverlayStateChange({ program: programData });
            };
        }
        // Show/Hide/Edit handlers
        container.querySelector('#show-program').onclick = () => {
            saveLiveProgramVisible(eventId, true);
            renderProgramPreview(container, eventData, onOverlayStateChange);
            if (onOverlayStateChange) onOverlayStateChange({ liveProgramVisible: true, program: programData });
        };
        container.querySelector('#hide-program').onclick = () => {
            saveLiveProgramVisible(eventId, false);
            renderProgramPreview(container, eventData, onOverlayStateChange);
            if (onOverlayStateChange) onOverlayStateChange({ liveProgramVisible: false, program: programData });
        };
        container.querySelector('#edit-program').onclick = () => {
            modal.style.display = 'flex';
        };
    });
}