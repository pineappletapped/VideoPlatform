import { ref, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";

const db = getDatabaseInstance();

let lastStatus = null;
let lastStatusFetch = 0;

export function renderStatusBar(container, eventData, opts = {}) {
    const options = Object.assign({ overlay: true, listener: true, atem: true, obs: true, firebase: true, sport: false, clock: false }, opts);
    function getHeartbeat(key) {
        const beat = parseInt(localStorage.getItem(key) || '0', 10);
        return Date.now() - beat < 10000;
    }
    const overlayOnline = getHeartbeat('overlayHeartbeat');
    const listenerOnline = getHeartbeat('listenerHeartbeat');
    const sportOnline = getHeartbeat('sportsHeartbeat');

    // ATEM/OBS status (from Firebase, refresh every 5min)
    const eventId = eventData.id || 'demo';
    function render(status) {
        container.innerHTML = `
            <div class='status-bar'>
                <div class="flex flex-wrap gap-4 items-center text-sm">
                    <span>Status: <span class="font-semibold">${eventData.status || 'unknown'}</span></span>
                    <span>Date: <span class="font-semibold" id="status-date"></span></span>
                    ${options.firebase && eventData.firebaseStatus ? `<span>Firebase: <span class="font-semibold ${eventData.firebaseStatus.includes('Connected') ? 'text-green-600' : 'text-red-600'}">${eventData.firebaseStatus}</span></span>` : ''}
                    ${options.overlay ? `<span>Overlay: <span class="font-semibold ${overlayOnline ? 'text-green-600' : 'text-red-600'}">${overlayOnline ? 'Online' : 'Offline'}</span></span>` : ''}
                    ${options.listener ? `<span>Listener: <span class="font-semibold ${listenerOnline ? 'text-green-600' : 'text-red-600'}">${listenerOnline ? 'Online' : 'Offline'}</span></span>` : ''}
                    ${options.sport ? `<span>Sports: <span class="font-semibold ${sportOnline ? 'text-green-600' : 'text-red-600'}">${sportOnline ? 'Online' : 'Offline'}</span></span>` : ''}
                    ${options.atem ? `<span>ATEM: <span class="font-semibold ${status?.atemConnected ? 'text-green-600' : 'text-red-600'}">${status?.atemConnected ? 'Connected' : 'Offline'}</span>${status?.atemIp ? ` <span class='text-xs text-gray-500'>(${status.atemIp})</span>` : ''}</span>` : ''}
                    ${options.obs ? `<span>OBS: <span class="font-semibold ${status?.obsConnected ? 'text-green-600' : 'text-red-600'}">${status?.obsConnected ? 'Connected' : 'Offline'}</span>${status?.obsIp ? ` <span class='text-xs text-gray-500'>(${status.obsIp})</span>` : ''}</span>` : ''}
                </div>
            </div>
        `;
        if(options.clock){
            const dEl = container.querySelector('#status-date');
            const updateClock = () => { if(dEl) dEl.textContent = new Date().toLocaleString(); };
            updateClock();
            if(!container._clockInt){ container._clockInt = setInterval(updateClock,1000); }
        } else if(container._clockInt){ clearInterval(container._clockInt); container._clockInt=null; }
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
        if (e.key === 'overlayHeartbeat' || e.key === 'listenerHeartbeat' || (options.sport && e.key === 'sportsHeartbeat')) {
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