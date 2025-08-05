import { setBranding, listenBranding, setUserBranding, listenUserBranding, resolveAssetPath } from '../firebase.js';

const FONT_OPTIONS = [
    'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana',
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Raleway'
];

function getBranding(targetId, isUser, callback) {
    const listener = isUser ? listenUserBranding : listenBranding;
    listener(targetId, (branding) => {
        if (!branding) {
            callback({
                primaryColor: '#e16316',
                secondaryColor1: '#004a77',
                secondaryColor2: '#e0f7ff',
                logoPrimary: '',
                logoSecondary: '',
                font: 'Arial',
                logos: { tl:'', tr:'', bl:'', br:'' },
                sponsors: [],
                scheduleSponsorPlacement: 'bottom-spaced',
                scheduleLayout: 'corner',
                socialTemplateStyle: 'style1'
            });
        } else {
            callback(branding);
        }
    });
}

function saveBranding(targetId, branding, isUser) {
    if (isUser) return setUserBranding(targetId, branding);
    return setBranding(targetId, branding);
}

export function renderBrandingModal(container, opts) {
    const eventId = opts.eventId || opts.id;
    const userId = opts.userId;
    const targetId = userId || eventId || 'demo';
    const isUser = !!userId;
    getBranding(targetId, isUser, (branding) => {
        container.innerHTML = `
            <div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div class="bg-white text-black p-6 rounded shadow-lg min-w-[340px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                    <h2 class="font-bold text-xl mb-4">${isUser ? 'Account Branding' : 'Event Branding'}</h2>
                    <form id="branding-form" class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold mb-1">Primary Color</label>
                            <input type="color" name="primaryColor" value="${branding.primaryColor}" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-1">Secondary Color 1</label>
                            <input type="color" name="secondaryColor1" value="${branding.secondaryColor1}" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-1">Secondary Color 2</label>
                            <input type="color" name="secondaryColor2" value="${branding.secondaryColor2}" />
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-1">Brand Font</label>
                            <select name="font" class="border p-1 w-full">
                                ${FONT_OPTIONS.map(f => `<option value="${f}"${branding.font === f ? ' selected' : ''}>${f}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold mb-1">Primary Logo</label>
                            <input type="file" name="logoPrimary" accept="image/*" class="mb-1" />
                            ${branding.logoPrimary ? `<img src="${resolveAssetPath(branding.logoPrimary)}" alt="Primary Logo" class="h-10 mt-1" />` : ''}
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold mb-1">Secondary Logo</label>
                            <input type="file" name="logoSecondary" accept="image/*" class="mb-1" />
                            ${branding.logoSecondary ? `<img src="${resolveAssetPath(branding.logoSecondary)}" alt="Secondary Logo" class="h-10 mt-1" />` : ''}
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-1">Schedule Sponsor Placement</label>
                            <select name="scheduleSponsorPlacement" class="border p-1 w-full">
                                <option value="top-right"${branding.scheduleSponsorPlacement==='top-right'?' selected':''}>Top Right</option>
                                <option value="bottom-centered"${branding.scheduleSponsorPlacement==='bottom-centered'?' selected':''}>Bottom Center</option>
                                <option value="bottom-spaced"${!branding.scheduleSponsorPlacement || branding.scheduleSponsorPlacement==='bottom-spaced'?' selected':''}>Bottom Spaced</option>
                                <option value="bottom-sides"${branding.scheduleSponsorPlacement==='bottom-sides'?' selected':''}>Two Sides</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-semibold mb-1">Schedule Layout</label>
                            <select name="scheduleLayout" class="border p-1 w-full">
                                <option value="corner"${!branding.scheduleLayout || branding.scheduleLayout==='corner'?' selected':''}>Corner Box</option>
                                <option value="center"${branding.scheduleLayout==='center'?' selected':''}>Center Box</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold mb-1">Social Template Style</label>
                            <select name="socialTemplateStyle" class="border p-1 w-full">
                                <option value="style1"${!branding.socialTemplateStyle || branding.socialTemplateStyle==='style1'?' selected':''}>Style 1</option>
                                <option value="style2"${branding.socialTemplateStyle==='style2'?' selected':''}>Style 2</option>
                                <option value="style3"${branding.socialTemplateStyle==='style3'?' selected':''}>Style 3</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <label class="block text-sm font-semibold mb-1">Preview</label>
                            <div id="branding-preview" class="p-4 rounded border" style="background:${branding.primaryColor}; color:${branding.secondaryColor2}; font-family:${branding.font};">Sample Text</div>
                        </div>
                        <label class="col-span-2 flex items-center gap-2 mt-2">
                            <input type="checkbox" name="applyAll" />
                            <span class="text-sm">Override existing graphics</span>
                        </label>
                        <div class="col-span-2 flex gap-2 mt-4">
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
            const logoPrimaryFile = form.logoPrimary.files[0];
            const logoSecondaryFile = form.logoSecondary.files[0];
            let logoPrimary = branding.logoPrimary || '';
            let logoSecondary = branding.logoSecondary || '';
            if (logoPrimaryFile) {
                const path = `uploads/${isUser ? 'user_'+targetId : targetId}/branding/primary_${logoPrimaryFile.name}`;
                const url = await upload(logoPrimaryFile, path);
                if (url) logoPrimary = url;
            }
            if (logoSecondaryFile) {
                const path = `uploads/${isUser ? 'user_'+targetId : targetId}/branding/secondary_${logoSecondaryFile.name}`;
                const url = await upload(logoSecondaryFile, path);
                if (url) logoSecondary = url;
            }
            const newBranding = {
                primaryColor: data.primaryColor,
                secondaryColor1: data.secondaryColor1,
                secondaryColor2: data.secondaryColor2,
                logoPrimary,
                logoSecondary,
                font: data.font,
                logos: branding.logos || {tl:'',tr:'',bl:'',br:''},
                sponsors: branding.sponsors || [],
                scheduleSponsorPlacement: data.scheduleSponsorPlacement || branding.scheduleSponsorPlacement || 'bottom-spaced',
                scheduleLayout: data.scheduleLayout || branding.scheduleLayout || 'corner',
                socialTemplateStyle: data.socialTemplateStyle || branding.socialTemplateStyle || 'style1',
                overrideAll: form.applyAll.checked
            };
            saveBranding(targetId, newBranding, isUser);
            container.classList.add('hidden');
        };
        container.querySelector('#branding-cancel').onclick = () => container.classList.add('hidden');

        const preview = form.querySelector('#branding-preview');
        const updatePreview = () => {
            preview.style.background = form.primaryColor.value;
            preview.style.color = form.secondaryColor2.value;
            preview.style.fontFamily = form.font.value;
        };
        ['primaryColor','secondaryColor2','font'].forEach(name => {
            form[name].addEventListener('input', updatePreview);
            form[name].addEventListener('change', updatePreview);
        });
        updatePreview();
    });
}

async function upload(file, path) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', path);
    const resp = await fetch('upload.php', { method: 'POST', body: fd });
    if (!resp.ok) return null;
    const d = await resp.json();
    return d.url;
}