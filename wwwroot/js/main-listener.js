import { eventStorage } from './storage.js';
import { renderStatusBar } from './components/statusBar.js';
import OBSWebSocket from 'https://cdn.jsdelivr.net/npm/obs-websocket-js@5.0.3/+esm';
import { ref, set } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "./firebaseApp.js";

const db = getDatabaseInstance();

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

// Camera state (localStorage for demo)
let cameras = JSON.parse(localStorage.getItem('listenerCameras') || '[]');

// ATEM state
let atems = JSON.parse(localStorage.getItem('listenerAtems') || '[]');

// OBS WebSocket state
let obsConfig = JSON.parse(localStorage.getItem('obsConfig') || '{}');
let obsConnected = false;
let obs;

function saveCameras() {
    localStorage.setItem('listenerCameras', JSON.stringify(cameras));
}

function saveAtems() {
    localStorage.setItem('listenerAtems', JSON.stringify(atems));
}

function saveObsConfig(config) {
    obsConfig = config;
    localStorage.setItem('obsConfig', JSON.stringify(config));
}
function setObsConnected(connected) {
    obsConnected = connected;
    localStorage.setItem('obsConnected', connected ? 'true' : 'false');
    window.dispatchEvent(new Event('storage'));
}

// --- ATEM/OBS status reporting ---
function getAtemStatus() {
    // For now, just use the first ATEM in the list
    if (atems.length > 0) {
        return { atemConnected: true, atemIp: atems[0].ip };
    }
    return { atemConnected: false };
}
function getObsStatus() {
    return { obsConnected, obsIp: obsConfig.url ? obsConfig.url.replace(/^ws:\/\//, '').split(':')[0] : undefined };
}
function getCameraStatus() {
    return { cameras };
}
function getLoadedVTStatus() {
    // Optionally, you could store the loaded VT in localStorage or a global variable
    // For now, just check window.loadedVT if available
    return { vt: window.loadedVT || null };
}
async function writeStatusToFirebase() {
    const status = { ...getAtemStatus(), ...getObsStatus(), ...getCameraStatus(), ...getLoadedVTStatus() };
    await set(ref(db, `status/${eventId}`), status);
}
setInterval(writeStatusToFirebase, 5 * 60 * 1000); // every 5 min
writeStatusToFirebase(); // initial write
// --- end status reporting ---

function renderCameras(container) {
    container.innerHTML = `
        <div class='status-bar mb-4'><h2 class="font-bold text-lg mb-2">Cameras</h2>
            <button class="control-button btn-sm mb-2" id="add-camera">Add Camera</button>
            <ul>
                ${cameras.map((cam, idx) => `
                    <li class="mb-2 border-b pb-2">
                        <div><span class="font-semibold">${cam.name}</span> ${cam.ptz ? '<span class="text-xs text-blue-600">[PTZ]</span>' : ''}</div>
                        <div class="text-xs text-gray-600">ATEM Input: ${cam.atemInput || '-'}</div>
                        ${cam.ptz ? `<div class="text-xs">IP: ${cam.ip || ''} | Protocol: ${cam.protocol || ''}</div>` : ''}
                        <button class="control-button btn-sm" data-action="edit" data-idx="${idx}">Edit</button>
                        <button class="control-button btn-sm" data-action="remove" data-idx="${idx}">Remove</button>
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
    container.querySelector('#add-camera').onclick = () => showCameraModal();
    container.querySelectorAll('button[data-action="edit"]').forEach(btn => {
        btn.onclick = () => showCameraModal(parseInt(btn.getAttribute('data-idx'), 10));
    });
    container.querySelectorAll('button[data-action="remove"]').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-idx'), 10);
            cameras.splice(idx, 1);
            saveCameras();
            renderCameras(container);
        };
    });
}

function showCameraModal(idx = null) {
    const modal = document.getElementById('camera-modal');
    const cam = idx !== null ? cameras[idx] : { name: '', ptz: false, ip: '', protocol: '', atemInput: '' };
    modal.innerHTML = `
        <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div class="bg-white p-6 rounded shadow-lg min-w-[320px] max-w-[95vw]">
                <h3 class="font-bold text-lg mb-4">${idx !== null ? 'Edit' : 'Add'} Camera</h3>
                <form id="camera-form">
                    <div class="mb-2">
                        <label class="block text-sm">Name</label>
                        <input class="border p-1 w-full" name="name" value="${cam.name}" required />
                    </div>
                    <div class="mb-2 flex items-center gap-2">
                        <label class="block text-sm">PTZ</label>
                        <input type="checkbox" name="ptz" ${cam.ptz ? 'checked' : ''} />
                    </div>
                    <div class="mb-2" id="ptz-fields" style="display:${cam.ptz ? 'block' : 'none'};">
                        <label class="block text-sm">IP Address</label>
                        <input class="border p-1 w-full" name="ip" value="${cam.ip || ''}" />
                        <label class="block text-sm mt-2">Protocol</label>
                        <input class="border p-1 w-full" name="protocol" value="${cam.protocol || ''}" />
                    </div>
                    <div class="mb-2">
                        <label class="block text-sm">ATEM Input</label>
                        <input class="border p-1 w-full" name="atemInput" value="${cam.atemInput || ''}" />
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="submit" class="control-button btn-sm">Save</button>
                        <button type="button" id="cancel-camera" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
    const form = modal.querySelector('#camera-form');
    const ptzCheckbox = form.querySelector('input[name="ptz"]');
    const ptzFields = form.querySelector('#ptz-fields');
    ptzCheckbox.onchange = () => {
        ptzFields.style.display = ptzCheckbox.checked ? 'block' : 'none';
    };
    form.onsubmit = e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form));
        const newCam = {
            name: data.name,
            ptz: !!form.ptz.checked,
            ip: form.ptz.checked ? data.ip : '',
            protocol: form.ptz.checked ? data.protocol : '',
            atemInput: data.atemInput
        };
        if (idx !== null) cameras[idx] = newCam; else cameras.push(newCam);
        saveCameras();
        modal.classList.add('hidden');
        renderCameras(document.getElementById('col-cameras'));
    };
    modal.querySelector('#cancel-camera').onclick = () => modal.classList.add('hidden');
}

function renderAtem(container) {
    container.innerHTML = `
        <div class='status-bar mb-4'><h2 class="font-bold text-lg mb-2">ATEM</h2>
            <button class="control-button btn-sm mb-2" id="add-atem">Add ATEM</button>
            <ul>
                ${atems.map((atem, idx) => `
                    <li class="mb-2 border-b pb-2">
                        <div><span class="font-semibold">${atem.name}</span> <span class="text-xs text-gray-600">[${atem.model}]</span></div>
                        <div class="text-xs text-gray-600">IP: ${atem.ip}</div>
                        <button class="control-button btn-sm" data-action="show-script" data-idx="${idx}">Show Python Script</button>
                        <button class="control-button btn-sm" data-action="remove" data-idx="${idx}">Remove</button>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div id="atem-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
            <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:320px;max-width:95vw;">
                <h3 class="font-bold text-lg mb-2">Add ATEM Device</h3>
                <form id="atem-form">
                    <div class="mb-2">
                        <label class="block text-sm">Name</label>
                        <input class="border p-1 w-full" name="name" required />
                    </div>
                    <div class="mb-2">
                        <label class="block text-sm">Model</label>
                        <select class="border p-1 w-full" name="model" required>
                            <option value="ATEM Mini">ATEM Mini</option>
                            <option value="ATEM Mini Pro">ATEM Mini Pro</option>
                            <option value="ATEM Mini Extreme">ATEM Mini Extreme</option>
                            <option value="ATEM Television Studio HD">ATEM Television Studio HD</option>
                            <option value="ATEM 1 M/E">ATEM 1 M/E</option>
                            <option value="ATEM 2 M/E">ATEM 2 M/E</option>
                        </select>
                    </div>
                    <div class="mb-2">
                        <label class="block text-sm">IP Address</label>
                        <input class="border p-1 w-full" name="ip" required />
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="submit" class="control-button btn-sm">Save</button>
                        <button type="button" id="atem-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        <div id="atem-script-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
            <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:320px;max-width:95vw;">
                <h3 class="font-bold text-lg mb-2">Python Bridge Script</h3>
                <textarea id="atem-script-text" class="border p-2 w-full text-xs" rows="16" readonly></textarea>
                <div class="flex gap-2 mt-4">
                    <button type="button" id="atem-script-close" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Close</button>
                    <button type="button" id="atem-script-copy" class="control-button btn-sm">Copy</button>
                </div>
            </div>
        </div>
    `;
    // Modal logic
    const modal = container.querySelector('#atem-modal');
    const scriptModal = container.querySelector('#atem-script-modal');
    const scriptText = container.querySelector('#atem-script-text');
    // Add ATEM
    container.querySelector('#add-atem').onclick = () => {
        modal.style.display = 'flex';
        modal.querySelector('form').reset();
    };
    // Save ATEM
    modal.querySelector('#atem-form').onsubmit = e => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(modal.querySelector('#atem-form')));
        atems.push(data);
        saveAtems();
        modal.style.display = 'none';
        renderAtem(container);
    };
    container.querySelector('#atem-cancel').onclick = () => { modal.style.display = 'none'; };
    // Remove ATEM
    container.querySelectorAll('button[data-action="remove"]').forEach(btn => {
        btn.onclick = () => {
            const idx = btn.getAttribute('data-idx');
            atems.splice(idx, 1);
            saveAtems();
            renderAtem(container);
        };
    });
    // Show Python Script
    container.querySelectorAll('button[data-action="show-script"]').forEach(btn => {
        btn.onclick = () => {
            const idx = btn.getAttribute('data-idx');
            const atem = atems[idx];
            scriptText.value = generateAtemPythonScript(atem);
            scriptModal.style.display = 'flex';
        };
    });
    // Script modal close/copy
    scriptModal.querySelector('#atem-script-close').onclick = () => { scriptModal.style.display = 'none'; };
    scriptModal.querySelector('#atem-script-copy').onclick = () => {
        scriptText.select();
        document.execCommand('copy');
    };
}

function generateAtemPythonScript(atem) {
    return `# Python ATEM Bridge Script\n# Requires: python-atem-switcher, websockets\n# pip install python-atem-switcher websockets\nimport asyncio\nimport websockets\nfrom atem_switcher import AtemSwitcher\n\nATEM_IP = '${atem.ip}'\nATEM_MODEL = '${atem.model}'\nBRIDGE_PORT = 8765\n\nasync def atem_bridge(websocket, path):\n    atem = AtemSwitcher()\n    await atem.connect(ATEM_IP)\n    print("Connected to ATEM", ATEM_MODEL, "at", ATEM_IP)\n    try:\n        async for message in websocket:\n            # Here you can parse and forward commands to the ATEM\n            print('Received:', message)\n            # Example: atem.cut()\n            # You can expand this to handle more commands\n            await websocket.send('ACK: ' + message)\n    finally:\n        await atem.disconnect()\n\nasync def main():\n    async with websockets.serve(atem_bridge, 'localhost', BRIDGE_PORT):\n        print('ATEM Bridge running on ws://localhost:' + str(BRIDGE_PORT))\n        await asyncio.Future()\n\nif __name__ == '__main__':\n    asyncio.run(main())\n`;
}

function renderObs(container) {
    container.innerHTML = `
        <div class='status-bar mb-4'><h2 class="font-bold text-lg mb-2">OBS</h2>
            <button class="control-button btn-sm mb-2" id="obs-connect">${obsConnected ? 'Disconnect' : 'Connect Webhook'}</button>
            <button class="control-button btn-sm mb-2" id="obs-send" ${obsConnected ? '' : 'disabled'}>Send Action</button>
            <div class="text-xs text-gray-600 mt-2">${obsConnected ? `Connected to ${obsConfig.url || ''}` : '(Not connected)'}</div>
        </div>
        <div id="obs-modal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.4);z-index:1000;align-items:center;justify-content:center;">
            <div style="background:#fff;padding:2rem;border-radius:0.5rem;min-width:320px;max-width:95vw;">
                <h3 class="font-bold text-lg mb-2">Connect to OBS WebSocket</h3>
                <form id="obs-form">
                    <div class="mb-2">
                        <label class="block text-sm">WebSocket URL</label>
                        <input class="border p-1 w-full" name="url" value="${obsConfig.url || 'ws://localhost:4455'}" required />
                    </div>
                    <div class="mb-2">
                        <label class="block text-sm">Password</label>
                        <input class="border p-1 w-full" name="password" type="password" value="${obsConfig.password || ''}" />
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="submit" class="control-button btn-sm">Connect</button>
                        <button type="button" id="obs-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    // Modal logic
    const modal = container.querySelector('#obs-modal');
    const form = container.querySelector('#obs-form');
    if (modal && form) {
        container.querySelector('#obs-cancel').onclick = () => { modal.style.display = 'none'; };
        form.onsubmit = async e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            saveObsConfig(data);
            await connectObs(data.url, data.password, container);
            modal.style.display = 'none';
            renderObs(container);
        };
    }
    // Connect/Disconnect button
    container.querySelector('#obs-connect').onclick = async () => {
        if (obsConnected) {
            await disconnectObs();
            renderObs(container);
        } else {
            modal.style.display = 'flex';
        }
    };
    // Send Action button
    container.querySelector('#obs-send').onclick = async () => {
        if (!obsConnected) return;
        try {
            await obs.call('StartStream');
            alert('OBS StartStream command sent!');
        } catch (err) {
            alert('Failed to send command: ' + err.message);
        }
    };
    // Listen for state changes
    window.onstorage = (e) => {
        if (e.key === 'obsConnected' || e.key === 'obsConfig') {
            renderObs(container);
        }
    };
}

async function connectObs(url, password, container) {
    obs = new OBSWebSocket();
    try {
        if (location.protocol === 'https:' && url.startsWith('ws://')) {
            url = 'wss://' + url.substring(5);
        }
        await obs.connect(url, password);
        setObsConnected(true);
        writeStatusToFirebase();
    } catch (err) {
        setObsConnected(false);
        writeStatusToFirebase();
        alert('Failed to connect: ' + err.message);
    }
}

async function disconnectObs() {
    if (obs) {
        try {
            await obs.disconnect();
        } catch {}
    }
    setObsConnected(false);
    writeStatusToFirebase();
}

async function initializeListener() {
    // Status bar
    const eventData = await eventStorage.loadEvent(eventId);
    renderStatusBar(document.getElementById('status-bar'), eventData);
    // Columns
    renderCameras(document.getElementById('col-cameras'));
    renderAtem(document.getElementById('col-atem'));
    renderObs(document.getElementById('col-obs'));
}

// Heartbeat for listener.html
function heartbeat() {
    localStorage.setItem('listenerHeartbeat', Date.now().toString());
}
setInterval(heartbeat, 3000);
heartbeat();

initializeListener();