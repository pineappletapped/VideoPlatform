// ATEM controls component
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";

const db = getDatabase(getApp());

export function renderAtemControls(container, eventData) {
    const eventId = eventData.id || 'demo';
    
    // Listen for ATEM status
    onValue(ref(db, `status/${eventId}/atem`), (snapshot) => {
        const status = snapshot.val() || {};
        render(status);
    });

    function render(status) {
        container.innerHTML = `
            <div class='atem-controls'>
                <h2 class="font-bold text-lg mb-2">ATEM Controls</h2>
                <div class="flex flex-col gap-2">
                    <div class="flex items-center gap-2">
                        <button class="control-button" id="connect-atem">
                            ${status.connected ? 'Disconnect ATEM' : 'Connect to Local Device'}
                        </button>
                        ${status.connected ? 
                            `<span class="text-xs text-green-600">Connected to ${status.ip || 'local device'}</span>` : 
                            '<span class="text-xs text-gray-500">Not connected</span>'}
                    </div>
                    ${status.connected ? `
                        <div class="mt-2 p-2 bg-gray-50 rounded">
                            <div class="text-sm font-semibold mb-1">Device Info:</div>
                            <div class="text-xs text-gray-600">Model: ${status.model || 'Unknown'}</div>
                            <div class="text-xs text-gray-600">IP: ${status.ip || 'Local'}</div>
                        </div>
                        <div class="mt-2">
                            <button class="control-button btn-sm" id="atem-cut">Cut</button>
                            <button class="control-button btn-sm" id="atem-auto">Auto</button>
                            <button class="control-button btn-sm" id="atem-preview" disabled>Preview</button>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Connect/Disconnect handler
        const connectBtn = container.querySelector('#connect-atem');
        if (connectBtn) {
            connectBtn.onclick = async () => {
                if (status.connected) {
                    await set(ref(db, `status/${eventId}/atemCommand`), {
                        action: 'disconnect',
                        timestamp: Date.now()
                    });
                } else {
                    await set(ref(db, `status/${eventId}/atemCommand`), {
                        action: 'connect',
                        ip: '127.0.0.1',
                        timestamp: Date.now()
                    });
                }
            };
        }
        // ATEM control handlers
        if (status.connected) {
            const cutBtn = container.querySelector('#atem-cut');
            if (cutBtn) {
                cutBtn.onclick = async () => {
                    await set(ref(db, `status/${eventId}/atemCommand`), {
                        action: 'cut',
                        timestamp: Date.now()
                    });
                };
            }
            const autoBtn = container.querySelector('#atem-auto');
            if (autoBtn) {
                autoBtn.onclick = async () => {
                    await set(ref(db, `status/${eventId}/atemCommand`), {
                        action: 'auto',
                        timestamp: Date.now()
                    });
                };
            }
        }
    }
}