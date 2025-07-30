import { ref, get, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";

const db = getDatabaseInstance();

// Helper to get cameras from listener
async function getListenerCameras(eventId) {
    // Cameras are stored in localStorage on listener, but for control, we need to read from Firebase
    // We'll store them in /status/{eventId}/cameras for this purpose (listener should write them there)
    const snap = await get(ref(db, `status/${eventId}/cameras`));
    return snap.val() || [];
}

// Helper to get loaded VT from Firebase (status/{eventId}/vt)
async function getLoadedVT(eventId) {
    const snap = await get(ref(db, `status/${eventId}/vt`));
    return snap.val() || null;
}

async function getVTReady(eventId) {
    const snap = await get(ref(db, `status/${eventId}/vtReady`));
    return !!snap.val();
}

// Send ATEM program change command via bridge (status/{eventId}/atemCommand)
async function sendAtemProgramChange(eventId, atemInput) {
    await set(ref(db, `status/${eventId}/atemCommand`), { action: 'program', input: atemInput, timestamp: Date.now() });
}

// Send VT play command (status/{eventId}/vtCommand)
async function sendVTPlayCommand(eventId, vt) {
    await set(ref(db, `status/${eventId}/vtCommand`), { action: 'play', vt, timestamp: Date.now() });
}

export async function renderInputSourcesBar(container, eventData) {
    const eventId = eventData.id || 'demo';

    let cameras = await getListenerCameras(eventId);
    let vt = await getLoadedVT(eventId);
    let vtReady = await getVTReady(eventId);

    function render() {
        container.innerHTML = `
        <div class='input-sources-bar'>
            <h2 class="font-bold text-lg mb-2">Input Sources</h2>
            <div id="input-cameras">
                <div class="font-semibold text-sm mb-1">Cameras</div>
                <div class="flex flex-col gap-2">
                    ${cameras.length === 0 ? '<div class="text-xs text-gray-400 p-2 border border-dashed border-gray-300 rounded bg-gray-50">No cameras found. Waiting for listener to send camera list.</div>' : cameras.map((cam, idx) => `
                        <button class="control-button btn-sm camera-source" data-idx="${idx}" data-atem-input="${cam.atemInput || ''}">${cam.name}</button>
                    `).join('')}
                </div>
            </div>
            <div id="input-vt" class="mt-4">
                <div class="font-semibold text-sm mb-1">VT</div>
                ${vt ? `
                    <button class="control-button btn-sm vt-source flex items-center gap-2 ${vtReady ? 'vt-buffered' : ''}" data-vt-name="${vt.name}">
                        <img src="${vt.thumbnail || 'https://via.placeholder.com/48x27?text=No+Thumb'}" class="w-8 h-5 object-cover rounded border" alt="thumb" />
                        <span>${vt.name}</span>
                    </button>
                ` : '<div class="text-xs text-gray-400">No VT loaded</div>'}
            </div>
        </div>
    `;
        // Attach handlers
        container.querySelectorAll('.camera-source').forEach(btn => {
            btn.onclick = async () => {
                const atemInput = btn.getAttribute('data-atem-input');
                if (atemInput) {
                    await sendAtemProgramChange(eventId, atemInput);
                    btn.classList.add('bg-blue-200');
                    setTimeout(() => btn.classList.remove('bg-blue-200'), 1000);
                }
            };
        });
        const vtBtn = container.querySelector('.vt-source');
        if (vtBtn && vt) {
            vtBtn.onclick = async () => {
                await sendVTPlayCommand(eventId, vt);
                vtBtn.classList.add('bg-blue-200');
                setTimeout(() => vtBtn.classList.remove('bg-blue-200'), 1000);
            };
        }
    }

    render();

    onValue(ref(db, `status/${eventId}/cameras`), snap => {
        cameras = snap.val() || [];
        render();
    });
    onValue(ref(db, `status/${eventId}/vt`), snap => {
        vt = snap.val() || null;
        render();
    });
    onValue(ref(db, `status/${eventId}/vtReady`), snap => {
        vtReady = !!snap.val();
        render();
    });
}