import { setBranding, getBranding as getBrandingFromFirebase, listenBranding } from '../firebase.js';

const FONT_OPTIONS = [
    'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway'
];

function getBranding(eventId, callback) {
    listenBranding(eventId, (branding) => {
        if (!branding) {
            callback({
                primaryColor: '#e16316',
                secondaryColor1: '#004a77',
                secondaryColor2: '#e0f7ff',
                logoPrimary: '',
                logoSecondary: '',
                font: 'Arial',
                logos: { tl:'', tr:'', bl:'', br:'' },
                sponsors: []
            });
        } else {
            callback(branding);
        }
    });
}

function saveBranding(eventId, branding) {
    setBranding(eventId, branding);
}

export function renderBrandingModal(container, eventData) {
    const eventId = eventData.id || 'demo';
    getBranding(eventId, (branding) => {
        container.innerHTML = `
            <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div class="bg-white p-6 rounded shadow-lg min-w-[340px] max-w-[95vw]">
                    <h2 class="font-bold text-xl mb-4">Event Branding</h2>
                    <form id="branding-form">
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Primary Color</label>
                            <input type="color" name="primaryColor" value="${branding.primaryColor}" />
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Secondary Color 1</label>
                            <input type="color" name="secondaryColor1" value="${branding.secondaryColor1}" />
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Secondary Color 2</label>
                            <input type="color" name="secondaryColor2" value="${branding.secondaryColor2}" />
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Primary Logo</label>
                            <input type="file" name="logoPrimary" accept="image/*" class="mb-1" />
                            ${branding.logoPrimary ? `<img src="${branding.logoPrimary}" alt="Primary Logo" class="h-10 mt-1" />` : ''}
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Secondary Logo</label>
                            <input type="file" name="logoSecondary" accept="image/*" class="mb-1" />
                            ${branding.logoSecondary ? `<img src="${branding.logoSecondary}" alt="Secondary Logo" class="h-10 mt-1" />` : ''}
                        </div>
                        <div class="mb-3">
                            <label class="block text-sm font-semibold mb-1">Brand Font</label>
                            <select name="font" class="border p-1 w-full">
                                ${FONT_OPTIONS.map(f => `<option value="${f}"${branding.font === f ? ' selected' : ''}>${f}</option>`).join('')}
                            </select>
                        </div>
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="branding-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        container.classList.remove('hidden');
        const form = container.querySelector('#branding-form');
        form.onsubmit = async e => {
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            // Handle logo uploads (convert to base64)
            const logoPrimaryFile = form.logoPrimary.files[0];
            const logoSecondaryFile = form.logoSecondary.files[0];
            let logoPrimary = branding.logoPrimary;
            let logoSecondary = branding.logoSecondary;
            if (logoPrimaryFile) logoPrimary = await fileToBase64(logoPrimaryFile);
            if (logoSecondaryFile) logoSecondary = await fileToBase64(logoSecondaryFile);
            const newBranding = {
                primaryColor: data.primaryColor,
                secondaryColor1: data.secondaryColor1,
                secondaryColor2: data.secondaryColor2,
                logoPrimary,
                logoSecondary,
                font: data.font,
                logos: branding.logos || {tl:'',tr:'',bl:'',br:''},
                sponsors: branding.sponsors || []
            };
            saveBranding(eventId, newBranding);
            container.classList.add('hidden');
        };
        container.querySelector('#branding-cancel').onclick = () => container.classList.add('hidden');
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