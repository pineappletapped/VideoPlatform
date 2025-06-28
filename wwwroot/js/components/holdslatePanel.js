import { updateOverlayState, listenOverlayState } from '../firebase.js';

let holdslateData = {};
let holdslateVisible = false;
let holdslatePreviewVisible = false;
let countdownInterval = null;

function saveHoldslateData(eventId, data) {
    holdslateData = data;
    updateOverlayState(eventId, { holdslate: data });
}
function saveHoldslateVisible(eventId, visible) {
    holdslateVisible = visible;
    updateOverlayState(eventId, { holdslateVisible: visible });
}

function saveHoldslatePreviewVisible(eventId, visible) {
    holdslatePreviewVisible = visible;
    updateOverlayState(eventId, { holdslatePreviewVisible: visible });
}

function renderCountdown(container, countdown) {
    const countdownEl = container.querySelector('#holdslate-countdown');
    if (!countdownEl) return;
    function updateCountdown() {
        const now = Date.now();
        const target = new Date(countdown).getTime();
        const diff = target - now;
        let countdownDisplay = '';
        if (diff > 0) {
            const mins = Math.floor(diff / 60000);
            const secs = Math.floor((diff % 60000) / 1000);
            countdownDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
        } else {
            countdownDisplay = '00:00';
        }
        countdownEl.textContent = countdownDisplay;
    }
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

export function renderHoldslatePanel(container, onOverlayStateChange) {
    const eventId = (window.eventId || 'demo');
    listenOverlayState(eventId, (state) => {
        holdslateData = (state && state.holdslate) || {};
        holdslateVisible = (state && state.holdslateVisible) || false;
        holdslatePreviewVisible = (state && state.holdslatePreviewVisible) || false;
        const { image, message, countdown } = holdslateData || {};
        const now = Date.now();
        let countdownDisplay = '';
        if (countdown) {
            const target = new Date(countdown).getTime();
            const diff = target - now;
            if (diff > 0) {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                countdownDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
            } else {
                countdownDisplay = '00:00';
            }
        }
        const highlight = holdslateVisible ? 'ring-4 ring-green-400' : holdslatePreviewVisible ? 'ring-4 ring-brand' : '';
        container.innerHTML = `
            <div class='holdslate-panel ${highlight}'>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="font-bold text-lg">Holdslate</h2>
                    <div>
                        <button class="control-button btn-sm${holdslatePreviewVisible ? ' ring-2 ring-brand' : ''}" id="preview-holdslate">Preview</button>
                        <button class="control-button btn-sm${holdslateVisible ? ' ring-2 ring-green-400' : ''}" id="take-holdslate">Take</button>
                        <button class="control-button btn-sm${!holdslateVisible && !holdslatePreviewVisible ? ' ring-2 ring-red-400' : ''}" id="hide-holdslate">Hide</button>
                        <button class="control-button btn-sm" id="edit-holdslate">Edit</button>
                    </div>
                </div>
                <div class="flex gap-4 items-center">
                    <div>
                        ${image ? `<img src="${image}" alt="Holdslate" style="max-width:120px;max-height:68px;border-radius:0.25rem;" />` : '<span class="text-xs text-gray-500">No image</span>'}
                    </div>
                    <div>
                        <div class="text-sm">${message ? `<span class="font-semibold">Message:</span> ${message}` : ''}</div>
                        <div class="text-sm">${countdown ? `<span class="font-semibold">Countdown:</span> <span id="holdslate-countdown"></span>` : ''}</div>
                    </div>
                </div>
                <div id="holdslate-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Edit Holdslate</h3>
                        <form id="holdslate-form">
                            <div class="mb-2">
                                <label class="block text-sm">Background Image (1920x1080)</label>
                                <input type="file" name="image" accept="image/*" />
                                ${image ? `<img src="${image}" alt="Holdslate" style="max-width:180px;max-height:100px;margin-top:0.5rem;" />` : ''}
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Message</label>
                                <input class="border p-1 w-full" name="message" value="${message || ''}" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Countdown (target date/time)</label>
                                <input class="border p-1 w-full" type="datetime-local" name="countdown" value="${countdown ? new Date(countdown).toISOString().slice(0,16) : ''}" />
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="holdslate-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
        if (countdown) renderCountdown(container, countdown);
        // Modal logic
        const modal = container.querySelector('#holdslate-modal');
        const form = container.querySelector('#holdslate-form');
        if (modal && form) {
            container.querySelector('#holdslate-cancel').onclick = () => { modal.style.display = 'none'; };
            form.onsubmit = async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                let img = image;
                if (form.image.files[0]) {
                    img = await fileToBase64(form.image.files[0]);
                }
                const newData = {
                    image: img,
                    message: data.message,
                    countdown: data.countdown
                };
                saveHoldslateData(eventId, newData);
                modal.style.display = 'none';
                if (onOverlayStateChange) onOverlayStateChange({ holdslate: newData });
            };
        }
        // Preview/Take/Hide/Edit handlers
        container.querySelector('#preview-holdslate').onclick = () => {
            saveHoldslatePreviewVisible(eventId, true);
            if (onOverlayStateChange) onOverlayStateChange({ holdslatePreviewVisible: true, holdslate: holdslateData });
        };
        container.querySelector('#take-holdslate').onclick = () => {
            saveHoldslateVisible(eventId, true);
            saveHoldslatePreviewVisible(eventId, false);
            if (onOverlayStateChange) onOverlayStateChange({ holdslateVisible: true, holdslatePreviewVisible: false, holdslate: holdslateData });
        };
        container.querySelector('#hide-holdslate').onclick = () => {
            saveHoldslateVisible(eventId, false);
            saveHoldslatePreviewVisible(eventId, false);
            if (onOverlayStateChange) onOverlayStateChange({ holdslateVisible: false, holdslatePreviewVisible: false, holdslate: holdslateData });
        };
        container.querySelector('#edit-holdslate').onclick = () => {
            modal.style.display = 'flex';
        };
    });
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
