import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getOrInitApp } from "../firebaseApp.js";

const db = getDatabase(getOrInitApp());

let lastStatus = null;
let lastStatusFetch = 0;

export function renderStatusBar(container, eventData) {
    // Heartbeat check
    const now = Date.now();
    const overlayBeat = parseInt(localStorage.getItem('overlayHeartbeat') || '0', 10);
    const listenerBeat = parseInt(localStorage.getItem('listenerHeartbeat') || '0', 10);
    const overlayOnline = (now - overlayBeat) < 10000;
    const listenerOnline = (now - listenerBeat) < 10000;

    // ATEM/OBS status (from Firebase, refresh every 5min)
    const eventId = eventData.id || 'demo';
    function render(status) {
        container.innerHTML = `
            <div class='status-bar'>
                <h2 class="font-bold text-lg mb-2">Status Bar</h2>
                <div class="flex flex-wrap gap-4 items-center text-sm">
                    <span>Status: <span class="font-semibold">${eventData.status || 'unknown'}</span></span>
                    <span>Date: <span class="font-semibold">${eventData.date || ''}</span></span>
                    ${eventData.firebaseStatus ? `<span>Firebase: <span class="font-semibold ${eventData.firebaseStatus.includes('Connected') ? 'text-green-600' : 'text-red-600'}">${eventData.firebaseStatus}</span></span>` : ''}
                    <span>Overlay: <span class="font-semibold ${overlayOnline ? 'text-green-600' : 'text-red-600'}">${overlayOnline ? 'Online' : 'Offline'}</span></span>
                    <span>Listener: <span class="font-semibold ${listenerOnline ? 'text-green-600' : 'text-red-600'}">${listenerOnline ? 'Online' : 'Offline'}</span></span>
                    <span>ATEM: <span class="font-semibold ${status?.atemConnected ? 'text-green-600' : 'text-red-600'}">${status?.atemConnected ? 'Connected' : 'Offline'}</span>${status?.atemIp ? ` <span class='text-xs text-gray-500'>(${status.atemIp})</span>` : ''}</span>
                    <span>OBS: <span class="font-semibold ${status?.obsConnected ? 'text-green-600' : 'text-red-600'}">${status?.obsConnected ? 'Connected' : 'Offline'}</span>${status?.obsIp ? ` <span class='text-xs text-gray-500'>(${status.obsIp})</span>` : ''}</span>
                </div>
            </div>
        `;
    }

    async function fetchStatusIfNeeded() {
        const now = Date.now();
        if (!lastStatus || now - lastStatusFetch > 5 * 60 * 1000) {
            try {
                const snap = await get(ref(db, `status/${eventId}`));
                lastStatus = snap.val() || {};
                lastStatusFetch = now;
            } catch {
                lastStatus = {};
            }
        }
        render(lastStatus);
    }

    fetchStatusIfNeeded();

    // Listen for heartbeat changes
    window.onstorage = (e) => {
        if (e.key === 'overlayHeartbeat' || e.key === 'listenerHeartbeat') {
            render(lastStatus || {});
        }
    };
    // Also update every 5s in case no storage event
    if (!container._heartbeatInterval) {
        container._heartbeatInterval = setInterval(() => render(lastStatus || {}), 5000);
    }
    // Poll status every 5min
    if (!container._statusInterval) {
        container._statusInterval = setInterval(fetchStatusIfNeeded, 5 * 60 * 1000);
    }
}