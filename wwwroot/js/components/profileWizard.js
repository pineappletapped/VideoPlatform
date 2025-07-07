import { setBranding, getBranding } from '../firebase.js';
import { getDatabaseInstance } from '../firebaseApp.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';
import { sportsData } from '../sportsConfig.js';
import { renderTeamsPanel } from './teamsPanel.js';

const db = getDatabaseInstance();

async function uploadToServer(file, path) {
    try {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', path.replace(/^\/+/, ''));
        const resp = await fetch('upload.php', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('upload failed');
        const data = await resp.json();
        return data.url;
    } catch (err) {
        console.error('Upload failed', err);
        return null;
    }
}

export function renderProfileWizard(container, eventData) {
    const eventId = eventData.id || 'demo';
    const sport = eventData.sport || 'Football';
    let step = 1;

    const teamsRef = ref(db, `teams/${eventId}`);

    async function renderBrandingStep() {
        const branding = await getBranding(eventId) || {
            primaryColor: '#e16316',
            secondaryColor1: '#004a77',
            secondaryColor2: '#e0f7ff',
            logoPrimary: ''
        };
        container.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-window">
                    <h2 class="font-bold mb-2">Event Branding</h2>
                    <form id="brand-form">
                        <div class="mb-2">
                            <label class="block text-sm">Primary Color</label>
                            <input type="color" name="primaryColor" value="${branding.primaryColor}" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Secondary Color 1</label>
                            <input type="color" name="secondaryColor1" value="${branding.secondaryColor1}" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Secondary Color 2</label>
                            <input type="color" name="secondaryColor2" value="${branding.secondaryColor2}" />
                        </div>
                        <div class="mb-2">
                            <label class="block text-sm">Organiser Logo</label>
                            <input type="file" id="brand-logo-file" accept="image/*" class="mb-1" />
                            ${branding.logoPrimary ? `<img src="${branding.logoPrimary}" class="h-10" />` : ''}
                        </div>
                        <input type="hidden" id="brand-logo" value="${branding.logoPrimary || ''}" />
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Next</button>
                            <button type="button" id="brand-skip" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Skip</button>
                        </div>
                    </form>
                </div>
            </div>`;
        container.classList.remove('hidden');
        const form = container.querySelector('#brand-form');
        const fileInput = container.querySelector('#brand-logo-file');
        form.onsubmit = async e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            let logo = container.querySelector('#brand-logo').value;
            const file = fileInput.files[0];
            if (file) {
                const path = `uploads/${eventId}/branding/org_${file.name}`;
                const url = await uploadToServer(file, path);
                if (url) logo = url;
            }
            await setBranding(eventId, {
                primaryColor: data.primaryColor,
                secondaryColor1: data.secondaryColor1,
                secondaryColor2: data.secondaryColor2,
                logoPrimary: logo
            });
            step = 2;
            renderStep();
        };
        container.querySelector('#brand-skip').onclick = () => { step = 2; renderStep(); };
    }

    async function renderTeamsStep() {
        const snap = await get(teamsRef);
        const cfg = sportsData[sport] || sportsData['Football'];
        const playerSlots = cfg.playersPerTeam + (cfg.subs || 0);
        const players = Array.from({ length: playerSlots }).map(() => ({ name: '', pos: '' }));
        const data = snap.val() || { teamA:{ name:'Team A', logo:'', players: players.slice() }, teamB:{ name:'Team B', logo:'', players: players.slice() } };
        container.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-window max-h-[95vh] overflow-y-auto">
                    <h2 class="font-bold mb-2">Teams</h2>
                    <div id="teams-panel"></div>
                    <div class="flex gap-2 mt-4">
                        <button id="teams-finish" class="control-button btn-sm">Finish</button>
                        <button id="teams-skip" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Skip</button>
                    </div>
                </div>
            </div>`;
        container.classList.remove('hidden');
        const panel = container.querySelector('#teams-panel');
        renderTeamsPanel(panel, eventId, sport);
        container.querySelector('#teams-finish').onclick = () => { step = 0; renderStep(); };
        container.querySelector('#teams-skip').onclick = () => { step = 0; renderStep(); };
    }

    function renderStep() {
        if (step === 1) renderBrandingStep();
        else if (step === 2) renderTeamsStep();
        else { container.classList.add('hidden'); container.innerHTML = ''; }
    }

    renderStep();
}
