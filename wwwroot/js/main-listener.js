import { eventStorage } from './storage.js';
import { renderStatusBar } from './components/statusBar.js';
import './components/topBar.js';
import OBSWebSocket from 'https://cdn.jsdelivr.net/npm/obs-websocket-js@5.0.3/+esm';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "./firebaseApp.js";
import { requireAuth, logout } from './auth.js';

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
let atemWs = null;
let atemWsConnected = false;
const terminal = document.getElementById('col-blank');

function log(msg) {
    if (terminal) {
        const div = document.createElement('div');
        div.textContent = msg;
        terminal.appendChild(div);
        terminal.scrollTop = terminal.scrollHeight;
    }
}

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
    if (atems.length > 0) {
        return { atemConnected: atemWsConnected, atemIp: atems[0].ip };
    }
    return { atemConnected: atemWsConnected };
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

onValue(ref(db, `status/${eventId}/atemCommand`), snap => {
    const cmd = snap.val();
    if (!cmd) return;
    log(`[CMD] ATEM ${cmd.action || ''} ${cmd.input || ''}`);
    if (atemWsConnected) {
        if (cmd.action === 'program') atemWs.send('PGM ' + cmd.input);
        else if (cmd.action === 'cut') atemWs.send('CUT');
    }
});

onValue(ref(db, `status/${eventId}/vtCommand`), snap => {
    const cmd = snap.val();
    if (!cmd) return;
    log(`[CMD] VT ${cmd.vt ? cmd.vt.name : cmd.action}`);
});

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
            writeStatusToFirebase();
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
                        ${atems.length > 0 ? `
                            <select class="border p-1 w-full" name="atemInput">
                                ${Array.from({length:8},(_,i)=>`<option value="${i+1}" ${cam.atemInput==i+1? 'selected':''}>${i+1}</option>`).join('')}
                            </select>` : `<input class="border p-1 w-full" name="atemInput" value="${cam.atemInput || ''}" />`}
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
        writeStatusToFirebase();
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
        <div id="atem-modal" class="modal-overlay" style="display:none;">
            <div class="modal-window">
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
                        <input class="border p-1 w-full" name="ip" value="192.168.1.51" required />
                    </div>
                    <div class="flex gap-2 mt-4">
                        <button type="submit" class="control-button btn-sm">Save</button>
                        <button type="button" id="atem-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        <div id="atem-script-modal" class="modal-overlay" style="display:none;">
            <div class="modal-window">
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
    const ip = atem.ip || '192.168.1.51';
    return `"""WebSocket \u2192 Blackmagic ATEM bridge (PyATEMMax)\nDirect-connect version"""

from __future__ import annotations

import argparse
import asyncio
import logging
import platform
import subprocess
import sys
from typing import Tuple

import PyATEMMax  # type: ignore
import websockets

BRIDGE_HOST = "localhost"
BRIDGE_PORT = 8765
HEARTBEAT_SECONDS = 5
DEFAULT_ATEM_IP = "${ip}"


def ping_host(host: str, count: int = 1, timeout: int = 1) -> bool:
    param = "-n" if platform.system().lower() == "windows" else "-c"
    cmd = ["ping", param, str(count), "-W", str(timeout), host]
    try:
        return subprocess.call(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL) == 0
    except FileNotFoundError:
        return False


async def heartbeat(atem: PyATEMMax.ATEMMax):
    while True:
        print(f"[HB] alive={atem.switcherAlive} | connected={atem.connected}")
        await asyncio.sleep(HEARTBEAT_SECONDS)


async def atem_bridge(websocket, path):
    client: Tuple[str, int] = websocket.remote_address
    print(f"[WS] Client connected from {client}")
    try:
        async for message in websocket:
            print("[WS] Received:", message)
            cmd = message.strip().upper()
            if cmd == "CUT":
                atem.execCut()
                await websocket.send("ACK: CUT")
            elif cmd.startswith("PGM ") and cmd[4:].isdigit():
                atem.setProgramInput(int(cmd[4:]))
                await websocket.send(f"ACK: PROGRAM\u2192{cmd[4:]}")
            else:
                await websocket.send("NACK: UNKNOWN CMD")
    finally:
        print(f"[WS] Client {client} disconnected")


async def main():
    p = argparse.ArgumentParser(description="ATEM WebSocket bridge (direct-connect)")
    p.add_argument("--ip", default=DEFAULT_ATEM_IP, help=f"ATEM IP address (default {DEFAULT_ATEM_IP})")
    p.add_argument("--timeout", type=float, default=10.0, help="Handshake timeout seconds (default 10)")
    p.add_argument("--debug", action="store_true", help="Enable PyATEMMax debug log")
    args = p.parse_args()

    if args.debug:
        logging.basicConfig(level=logging.DEBUG)

    if not ping_host(args.ip):
        print(f"\u26A0\ufe0f  {args.ip} did not answer ping \u2014 continuing anyway …")

    global atem
    atem = PyATEMMax.ATEMMax()
    print(f"Connecting to ATEM at {args.ip} …")
    atem.connect(args.ip)
    if not atem.waitForConnection(infinite=False, timeout=args.timeout):
        raise RuntimeError("Handshake failed \u2014 is Ethernet control enabled and UDP 9910/9911 open?")
    print(f"\u2705 Connected to ATEM at {args.ip}")

    asyncio.create_task(heartbeat(atem))

    async with websockets.serve(atem_bridge, BRIDGE_HOST, BRIDGE_PORT):
        print(f"\U0001F310 Bridge listening on ws://{BRIDGE_HOST}:{BRIDGE_PORT}")
        await asyncio.Future()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down…")
    except Exception as e:
        print("❌", e)
        sys.exit(1)
    finally:
        try:
            atem.disconnect()
        except Exception:
            pass
`;
}

function renderObs(container) {
    container.innerHTML = `
        <div class='status-bar mb-4'><h2 class="font-bold text-lg mb-2">OBS</h2>
            <button class="control-button btn-sm mb-2" id="obs-connect">${obsConnected ? 'Disconnect' : 'Connect Webhook'}</button>
            <button class="control-button btn-sm mb-2" id="obs-send" ${obsConnected ? '' : 'disabled'}>Send Action</button>
            <div class="text-xs text-gray-600 mt-2">${obsConnected ? `Connected to ${obsConfig.url || ''}` : '(Not connected)'}</div>
        </div>
        <div id="obs-modal" class="modal-overlay" style="display:none;">
            <div class="modal-window">
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

function connectAtemWs() {
    try {
        atemWs = new WebSocket('ws://localhost:8765');
        atemWs.onopen = () => {
            atemWsConnected = true;
            log('[ATEM] bridge connected');
            writeStatusToFirebase();
        };
        atemWs.onclose = () => {
            atemWsConnected = false;
            log('[ATEM] bridge disconnected');
            writeStatusToFirebase();
        };
        atemWs.onmessage = (e) => log('[ATEM] ' + e.data);
    } catch (err) {
        log('Failed to connect ATEM bridge: ' + err.message);
    }
}

async function initializeListener() {
    // Status bar
    const eventData = await eventStorage.loadEvent(eventId);
    const topBar = document.createElement('top-bar');
    topBar.addEventListener('logout', logout);
    topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
    document.getElementById('top-bar').appendChild(topBar);
    renderStatusBar(document.getElementById('status-bar'), eventData);
    // Columns
    renderCameras(document.getElementById('col-cameras'));
    renderAtem(document.getElementById('col-atem'));
    renderObs(document.getElementById('col-obs'));
    connectAtemWs();
}

// Heartbeat for listener.html
function heartbeat() {
    localStorage.setItem('listenerHeartbeat', Date.now().toString());
}
setInterval(heartbeat, 3000);
heartbeat();

requireAuth(`listener.html?event_id=${eventId}`).then(initializeListener);
