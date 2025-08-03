import { updateOverlayState, listenOverlayState } from '../firebase.js';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";
import { getDatabaseInstance } from "../firebaseApp.js";

const db = getDatabaseInstance();

function getIntroRef(eventId) {
    return ref(db, `holdslates/${eventId}`);
}

function getIntroSettingsRef(eventId) {
    return ref(db, `introSettings/${eventId}`);
}

export function renderIntroPanel(container, eventId, onOverlayStateChange) {
    const eid = eventId || 'demo';
    let intros = [];
    let introSettings = {};
    let activeIntro = {};
    let visible = false;
    let preview = false;

    onValue(getIntroRef(eid), snap => {
        intros = snap.val() || [];
        render();
    });

    onValue(getIntroSettingsRef(eid), snap => {
        introSettings = snap.val() || {};
        updateOverlayState(eid,{ holdslateSettings:introSettings });
        render();
    });

    listenOverlayState(eid, state => {
        activeIntro = (state && state.holdslate) || {};
        visible = !!(state && state.holdslateVisible);
        preview = !!(state && state.holdslatePreviewVisible);
        render();
    });

    async function saveIntros(list){
        await set(getIntroRef(eid), list);
    }

    function render(){
        const highlight = visible ? 'ring-4 ring-green-400' : preview ? 'ring-4 ring-brand' : '';
        const weatherSection = introSettings.weatherLoc ? `<div class="mb-2"><button class="control-button btn-sm" id="hs-edit-weather">Weather Graphic</button></div>` : '';
        container.innerHTML = `
            <div class='intro-panel ${highlight}'>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="font-bold text-lg">Intro Graphics</h2>
                    <div class="flex gap-2">
                        <button class="control-button btn-sm" id="hs-input">Input</button>
                        <button class="control-button btn-sm" id="hs-add">Add</button>
                    </div>
                </div>
                <div class="flex gap-2 mb-2">
                    <button class="control-button btn-sm" id="hs-show-fixtures">Show Fixtures</button>
                    <button class="control-button btn-sm" id="hs-show-formation">Formation Graphic</button>
                    <button class="control-button btn-sm" id="hs-show-course">Course Details</button>
                </div>
                ${weatherSection}
                <ul class="space-y-2 mb-4">
                    ${intros.length===0 ? `<li class='text-gray-400'>No intro graphics yet.</li>` : intros.map((hs,i)=>`
                        <li class="flex items-center gap-4 bg-gray-50 rounded p-2 text-gray-900">
                            <img src="${hs.image || ''}" alt="thumb" class="w-16 h-9 object-cover rounded border" />
                            <div class="flex-1">${hs.title || hs.name || 'Intro '+(i+1)}</div>
                            <button class="control-button btn-sm" data-action="preview" data-idx="${i}">Preview</button>
                            <button class="control-button btn-sm" data-action="live" data-idx="${i}">Live</button>
                            <button class="control-button btn-sm" data-action="edit" data-idx="${i}">Edit</button>
                            <button class="control-button btn-sm btn-remove" data-action="remove" data-idx="${i}">Remove</button>
                        </li>
                    `).join('')}
                </ul>
                <div id="hs-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2" id="hs-modal-title">Add Intro Graphic</h3>
                        <form id="hs-form">
                            <div class="mb-2">
                                <label class="block text-sm">Name</label>
                                <input class="border p-1 w-full" name="name" required />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Title</label>
                                <input class="border p-1 w-full" name="title" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Image</label>
                                <input type="file" id="hs-file" accept="image/*" />
                                <button type="button" id="hs-upload" class="control-button btn-sm mt-1">Upload</button>
                                <input class="border p-1 w-full mt-1" name="image" placeholder="Uploaded image URL" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Message</label>
                                <input class="border p-1 w-full" name="message" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Countdown</label>
                                <input class="border p-1 w-full" type="datetime-local" name="countdown" />
                            </div>
                            <input type="hidden" name="idx" />
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="hs-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                                <span id="hs-status" class="text-xs text-gray-600 ml-2"></span>
                            </div>
                        </form>
                    </div>
                </div>
                <div id="hs-input-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Intro Settings</h3>
                        <form id="hs-input-form">
                            <div class="mb-2">
                                <label class="block text-sm">Venue Location</label>
                                <input class="border p-1 w-full" name="venue" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Weather Location</label>
                                <input class="border p-1 w-full" name="weatherLoc" />
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="hs-input-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div id="hs-weather-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Weather Graphic</h3>
                        <form id="hs-weather-form">
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time1" placeholder="Time 1" />
                                <input class="border p-1 flex-1" name="icon1" placeholder="Icon" />
                                <input class="border p-1 flex-1" name="temp1" placeholder="Temp" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time2" placeholder="Time 2" />
                                <input class="border p-1 flex-1" name="icon2" placeholder="Icon" />
                                <input class="border p-1 flex-1" name="temp2" placeholder="Temp" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time3" placeholder="Time 3" />
                                <input class="border p-1 flex-1" name="icon3" placeholder="Icon" />
                                <input class="border p-1 flex-1" name="temp3" placeholder="Temp" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input type="color" class="flex-1" name="color1" />
                                <input type="color" class="flex-1" name="color2" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Animation</label>
                                <input class="border p-1 w-full" name="animation" placeholder="fade" />
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="hs-weather-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        container.querySelector('#hs-add').onclick = () => showModal();
        const fixturesBtn = container.querySelector('#hs-show-fixtures');
        if(fixturesBtn) fixturesBtn.onclick = () => updateOverlayState(eid,{ fixturesVisible:true });
        const formBtn = container.querySelector('#hs-show-formation');
        if(formBtn) formBtn.onclick = () => updateOverlayState(eid,{ formationVisible:true });
        const courseBtn = container.querySelector('#hs-show-course');
        if(courseBtn) courseBtn.onclick = () => updateOverlayState(eid,{ courseVisible:true });

        container.querySelectorAll('button[data-action]').forEach(btn=>{
            const idx = parseInt(btn.getAttribute('data-idx'));
            const act = btn.getAttribute('data-action');
            if(act==='preview') btn.onclick=()=>{
                updateOverlayState(eid,{ holdslate: intros[idx], holdslatePreviewVisible:true, holdslateVisible:false });
                if(onOverlayStateChange) onOverlayStateChange({ holdslatePreviewVisible:true, holdslate: intros[idx] });
            };
            if(act==='live') btn.onclick=()=>{
                updateOverlayState(eid,{ holdslate: intros[idx], holdslateVisible:true, holdslatePreviewVisible:false });
                if(onOverlayStateChange) onOverlayStateChange({ holdslateVisible:true, holdslatePreviewVisible:false, holdslate: intros[idx] });
            };
            if(act==='edit') btn.onclick=()=> showModal(intros[idx], idx);
            if(act==='remove') btn.onclick=async()=>{ intros.splice(idx,1); await saveIntros(intros); };
        });

        const inputBtn = container.querySelector('#hs-input');
        if(inputBtn) inputBtn.onclick = () => showInputModal();
        const weatherBtn = container.querySelector('#hs-edit-weather');
        if(weatherBtn) weatherBtn.onclick = () => showWeatherModal();

        const modal = container.querySelector('#hs-modal');
        const form = container.querySelector('#hs-form');
        if(modal && form){
            container.querySelector('#hs-cancel').onclick = () => { modal.style.display='none'; };
            form.onsubmit = async e => {
                e.preventDefault();
                const data = Object.fromEntries(new FormData(form));
                let img = data.image;
                if(form['hs-file'].files[0]){
                    const path = `uploads/${eid}/holdslates/${form['hs-file'].files[0].name}`;
                    setStatus('Uploading...');
                    const url = await uploadToServer(form['hs-file'].files[0], path);
                    setStatus('');
                    if(url) img = url;
                }
                const hs = { name:data.name, title:data.title, image:img, message:data.message, countdown:data.countdown };
                if(data.idx){ intros[data.idx] = hs; } else { intros.push(hs); }
                await saveIntros(intros);
                modal.style.display='none';
            };
            container.querySelector('#hs-upload').onclick = async () => {
                if(form['hs-file'].files[0]){
                    const path = `uploads/${eid}/holdslates/${form['hs-file'].files[0].name}`;
                    setStatus('Uploading...');
                    const url = await uploadToServer(form['hs-file'].files[0], path);
                    setStatus('');
                    if(url) form.image.value = url;
                }
            };
        }
    }

    function showModal(hs={}, idx=''){
        const modal = container.querySelector('#hs-modal');
        const form = container.querySelector('#hs-form');
        if(!modal || !form) return;
        form.name.value = hs.name || '';
        form.title.value = hs.title || '';
        form.image.value = hs.image || '';
        form.message.value = hs.message || '';
        form.countdown.value = hs.countdown ? new Date(hs.countdown).toISOString().slice(0,16) : '';
        form['hs-file'].value = '';
        form.idx.value = idx;
        container.querySelector('#hs-modal-title').textContent = idx===''?'Add Intro Graphic':'Edit Intro Graphic';
        modal.style.display = 'flex';
    }

    function setStatus(t){
        const el = document.getElementById('hs-status');
        if(el) el.textContent = t;
    }

    function showInputModal(){
        const modal = container.querySelector('#hs-input-modal');
        const form = container.querySelector('#hs-input-form');
        if(!modal || !form) return;
        form.venue.value = introSettings.venue || '';
        form.weatherLoc.value = introSettings.weatherLoc || '';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            introSettings.venue = data.venue || '';
            introSettings.weatherLoc = data.weatherLoc || '';
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#hs-input-cancel').onclick = ()=>{ modal.style.display='none'; };
    }

    function showWeatherModal(){
        const modal = container.querySelector('#hs-weather-modal');
        const form = container.querySelector('#hs-weather-form');
        if(!modal || !form) return;
        const slots = introSettings.weatherSlots || [];
        form.time1.value = slots[0]?.time || '';
        form.icon1.value = slots[0]?.icon || '';
        form.temp1.value = slots[0]?.temp || '';
        form.time2.value = slots[1]?.time || '';
        form.icon2.value = slots[1]?.icon || '';
        form.temp2.value = slots[1]?.temp || '';
        form.time3.value = slots[2]?.time || '';
        form.icon3.value = slots[2]?.icon || '';
        form.temp3.value = slots[2]?.temp || '';
        form.color1.value = introSettings.color1 || '#ffffff';
        form.color2.value = introSettings.color2 || '#000000';
        form.animation.value = introSettings.animation || '';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            introSettings.weatherSlots = [
                {time:form.time1.value, icon:form.icon1.value, temp:form.temp1.value},
                {time:form.time2.value, icon:form.icon2.value, temp:form.temp2.value},
                {time:form.time3.value, icon:form.icon3.value, temp:form.temp3.value}
            ];
            introSettings.color1 = form.color1.value;
            introSettings.color2 = form.color2.value;
            introSettings.animation = form.animation.value;
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#hs-weather-cancel').onclick = ()=>{ modal.style.display='none'; };
    }

    async function uploadToServer(file, path){
        try{
            const fd = new FormData();
            fd.append('file', file);
            fd.append('path', path.replace(/^\/+/, ''));
            const resp = await fetch('upload.php', {method:'POST', body:fd});
            if(!resp.ok) throw new Error('upload failed');
            const data = await resp.json();
            return data.url;
        }catch(err){ console.error('Upload failed', err); return null; }
    }
}
