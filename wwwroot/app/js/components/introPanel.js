import { updateOverlayState, listenOverlayState, listenTeams } from '../firebase.js';
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
    let teamsData = null;
    let tournamentData = null;

    onValue(getIntroRef(eid), snap => {
        intros = snap.val() || [];
        render();
    });

    onValue(getIntroSettingsRef(eid), snap => {
        introSettings = snap.val() || {};
        updateOverlayState(eid,{ holdslateSettings:introSettings });
        render();
    });
    listenTeams(eid, data => { teamsData = data; render(); });
    onValue(ref(db, `tournament/${eid}`), snap => { tournamentData = snap.val(); render(); });

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
        const teamOptions = teamsData ? (teamsData.teams ? teamsData.teams.map((t,i)=>`<option value="${i}">${t.name}</option>`).join('') : ['a','b'].map(k=>`<option value="${k}">${teamsData[k==='a'?'teamA':'teamB']?.name || ('Team '+k.toUpperCase())}</option>`).join('')) : '';
        const formationRow = teamsData ? `<div class="flex items-center gap-2"><span class="flex-1">Formation Graphic</span><select id="formation-team" class="border p-1 flex-1">${teamOptions}</select><button class="control-button btn-sm" id="formation-preview">Preview</button><button class="control-button btn-sm" id="formation-live">Live</button><button class="control-button btn-sm" id="formation-edit">Edit</button></div>` : '';
        container.innerHTML = `
            <div class='intro-panel ${highlight}'>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="font-bold text-lg">Intro Graphics</h2>
                    <button class="control-button btn-sm" id="hs-input">Input data</button>
                </div>
                <div class="space-y-2 mb-4">
                    <div class="flex items-center gap-2">
                        <span class="flex-1">Show Fixtures</span>
                        <button class="control-button btn-sm" id="fixtures-preview">Preview</button>
                        <button class="control-button btn-sm" id="fixtures-live">Live</button>
                        <button class="control-button btn-sm" id="fixtures-edit">Edit</button>
                    </div>
                    ${formationRow}
                    <div class="flex items-center gap-2">
                        <span class="flex-1">Course Details</span>
                        <button class="control-button btn-sm" id="course-preview">Preview</button>
                        <button class="control-button btn-sm" id="course-live">Live</button>
                        <button class="control-button btn-sm" id="course-edit">Edit</button>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="flex-1">Weather</span>
                        <button class="control-button btn-sm" id="weather-preview">Preview</button>
                        <button class="control-button btn-sm" id="weather-live">Live</button>
                        <button class="control-button btn-sm" id="weather-edit">Edit</button>
                    </div>
                </div>
                <div class="flex items-center justify-between mb-2">
                    <h3 class="font-bold text-md">Holdslates</h3>
                    <button class="control-button btn-sm" id="hs-add">Add</button>
                </div>
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
                <div id="hs-weather-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Weather Graphic</h3>
                        <form id="hs-weather-form">
                            <div class="mb-2">
                                <label class="block text-sm">Venue Location</label>
                                <input class="border p-1 w-full" name="venue" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Event Date</label>
                                <input class="border p-1 w-full" type="date" name="eventDate" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Weather Location</label>
                                <input class="border p-1 w-full" name="weatherLoc" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time1" placeholder="Time 1" />
                                <select class="border p-1 flex-1" name="icon1">
                                    <option value="sun">Sun</option>
                                    <option value="cloud">Cloudy</option>
                                    <option value="rain">Rain</option>
                                    <option value="thunder">Thunder</option>
                                    <option value="snow">Snow</option>
                                    <option value="wind">Windy</option>
                                    <option value="suncloud">Sun + Cloud</option>
                                </select>
                                <input class="border p-1 flex-1" name="temp1" placeholder="Temp" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time2" placeholder="Time 2" />
                                <select class="border p-1 flex-1" name="icon2">
                                    <option value="sun">Sun</option>
                                    <option value="cloud">Cloudy</option>
                                    <option value="rain">Rain</option>
                                    <option value="thunder">Thunder</option>
                                    <option value="snow">Snow</option>
                                    <option value="wind">Windy</option>
                                    <option value="suncloud">Sun + Cloud</option>
                                </select>
                                <input class="border p-1 flex-1" name="temp2" placeholder="Temp" />
                            </div>
                            <div class="mb-2 flex gap-2">
                                <input class="border p-1 flex-1" name="time3" placeholder="Time 3" />
                                <select class="border p-1 flex-1" name="icon3">
                                    <option value="sun">Sun</option>
                                    <option value="cloud">Cloudy</option>
                                    <option value="rain">Rain</option>
                                    <option value="thunder">Thunder</option>
                                    <option value="snow">Snow</option>
                                    <option value="wind">Windy</option>
                                    <option value="suncloud">Sun + Cloud</option>
                                </select>
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
                <div id="fixtures-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Fixtures</h3>
                        <form id="fixtures-form">
                            <div id="fixtures-list" class="mb-2"></div>
                            <div class="mb-2">
                                <label class="block text-sm">Style</label>
                                <select name="style" class="border p-1 w-full">
                                    <option value="style1">Style 1</option>
                                    <option value="style2">Style 2</option>
                                    <option value="style3">Style 3</option>
                                </select>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Transition</label>
                                <select name="transition" class="border p-1 w-full">
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="wipe">Wipe</option>
                                </select>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="fixtures-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div id="formation-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Formation Settings</h3>
                        <form id="formation-form">
                            <div class="mb-2">
                                <label class="block text-sm">Style</label>
                                <select name="style" class="border p-1 w-full">
                                    <option value="style1">Style 1</option>
                                    <option value="style2">Style 2</option>
                                    <option value="style3">Style 3</option>
                                </select>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Transition</label>
                                <select name="transition" class="border p-1 w-full">
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="wipe">Wipe</option>
                                </select>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="formation-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div id="course-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <h3 class="font-bold text-lg mb-2">Course Details</h3>
                        <form id="course-form">
                            <div class="mb-2">
                                <label class="block text-sm">Course Name</label>
                                <input class="border p-1 w-full" name="name" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Length</label>
                                <input class="border p-1 w-full" name="length" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Par</label>
                                <input class="border p-1 w-full" name="par" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Image URL</label>
                                <input class="border p-1 w-full" name="image" />
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Style</label>
                                <select name="style" class="border p-1 w-full">
                                    <option value="style1">Style 1</option>
                                    <option value="style2">Style 2</option>
                                    <option value="style3">Style 3</option>
                                </select>
                            </div>
                            <div class="mb-2">
                                <label class="block text-sm">Transition</label>
                                <select name="transition" class="border p-1 w-full">
                                    <option value="fade">Fade</option>
                                    <option value="slide">Slide</option>
                                    <option value="wipe">Wipe</option>
                                </select>
                            </div>
                            <div class="flex gap-2 mt-4">
                                <button type="submit" class="control-button btn-sm">Save</button>
                                <button type="button" id="course-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>`;

        function buildFormationData(){
            if(!teamsData) return {};
            const selEl = container.querySelector('#formation-team');
            const sel = selEl ? selEl.value : 'a';
            let teamName = '';
            if(teamsData.teams){
                const t = teamsData.teams[parseInt(sel,10)] || {};
                teamName = t.name || '';
            }else{
                teamName = sel==='b' ? teamsData.teamB?.name || '' : teamsData.teamA?.name || '';
            }
            return { team: sel, teamName, style: introSettings.formation?.style || 'style1', transition: introSettings.formation?.transition || 'fade' };
        }

        container.querySelector('#hs-add').onclick = () => showModal();

        const fixturesPrev = container.querySelector('#fixtures-preview');
        if(fixturesPrev) fixturesPrev.onclick = () => {
            updateOverlayState(eid,{ fixtures: introSettings.fixtures || {}, fixturesPreviewVisible:true, fixturesVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ fixturesPreviewVisible:true, fixtures:introSettings.fixtures });
        };
        const fixturesLive = container.querySelector('#fixtures-live');
        if(fixturesLive) fixturesLive.onclick = () => {
            updateOverlayState(eid,{ fixtures: introSettings.fixtures || {}, fixturesVisible:true, fixturesPreviewVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ fixturesVisible:true, fixtures:introSettings.fixtures, fixturesPreviewVisible:false });
        };
        const fixturesEdit = container.querySelector('#fixtures-edit');
        if(fixturesEdit) fixturesEdit.onclick = () => showFixturesModal();

        const formationPrev = container.querySelector('#formation-preview');
        if(formationPrev) formationPrev.onclick = () => {
            const data = buildFormationData();
            updateOverlayState(eid,{ formation:data, formationPreviewVisible:true, formationVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ formationPreviewVisible:true, formation:data });
        };
        const formationLive = container.querySelector('#formation-live');
        if(formationLive) formationLive.onclick = () => {
            const data = buildFormationData();
            updateOverlayState(eid,{ formation:data, formationVisible:true, formationPreviewVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ formationVisible:true, formation:data, formationPreviewVisible:false });
        };
        const formationEdit = container.querySelector('#formation-edit');
        if(formationEdit) formationEdit.onclick = () => showFormationModal();

        const coursePrev = container.querySelector('#course-preview');
        if(coursePrev) coursePrev.onclick = () => {
            updateOverlayState(eid,{ course:introSettings.course || {}, coursePreviewVisible:true, courseVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ coursePreviewVisible:true, course:introSettings.course });
        };
        const courseLive = container.querySelector('#course-live');
        if(courseLive) courseLive.onclick = () => {
            updateOverlayState(eid,{ course:introSettings.course || {}, courseVisible:true, coursePreviewVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ courseVisible:true, course:introSettings.course, coursePreviewVisible:false });
        };
        const courseEdit = container.querySelector('#course-edit');
        if(courseEdit) courseEdit.onclick = () => showCourseModal();

        const weatherPrev = container.querySelector('#weather-preview');
        if(weatherPrev) weatherPrev.onclick = () => {
            const data = { weatherLoc:introSettings.weatherLoc || '', slots:introSettings.weatherSlots || [] };
            updateOverlayState(eid,{ weather:data, weatherPreviewVisible:true, weatherVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ weatherPreviewVisible:true, weather:data });
        };
        const weatherLive = container.querySelector('#weather-live');
        if(weatherLive) weatherLive.onclick = () => {
            const data = { weatherLoc:introSettings.weatherLoc || '', slots:introSettings.weatherSlots || [] };
            updateOverlayState(eid,{ weather:data, weatherVisible:true, weatherPreviewVisible:false });
            if(onOverlayStateChange) onOverlayStateChange({ weatherVisible:true, weather:data, weatherPreviewVisible:false });
        };
        const weatherEdit = container.querySelector('#weather-edit');
        if(weatherEdit) weatherEdit.onclick = () => showWeatherModal();

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
        if(inputBtn) inputBtn.onclick = () => showWeatherModal();

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

    function showWeatherModal(){
        const modal = container.querySelector('#hs-weather-modal');
        const form = container.querySelector('#hs-weather-form');
        if(!modal || !form) return;
        const slots = introSettings.weatherSlots || [];
        form.venue.value = introSettings.venue || '';
        form.eventDate.value = introSettings.eventDate || '';
        form.weatherLoc.value = introSettings.weatherLoc || '';
        form.time1.value = slots[0]?.time || '';
        form.icon1.value = slots[0]?.icon || 'sun';
        form.temp1.value = slots[0]?.temp || '';
        form.time2.value = slots[1]?.time || '';
        form.icon2.value = slots[1]?.icon || 'sun';
        form.temp2.value = slots[1]?.temp || '';
        form.time3.value = slots[2]?.time || '';
        form.icon3.value = slots[2]?.icon || 'sun';
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
            introSettings.venue = form.venue.value;
            introSettings.eventDate = form.eventDate.value;
            introSettings.weatherLoc = form.weatherLoc.value;
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#hs-weather-cancel').onclick = ()=>{ modal.style.display='none'; };
    }

    function showFixturesModal(){
        const modal = container.querySelector('#fixtures-modal');
        const form = container.querySelector('#fixtures-form');
        if(!modal || !form) return;
        const listDiv = form.querySelector('#fixtures-list');
        const existing = introSettings.fixtures?.list || [];
        let list = [];
        if(tournamentData && tournamentData.matches && teamsData && teamsData.teams){
            list = tournamentData.matches.map(m=>{
                const ta = teamsData.teams[m.teamA] || {name:'Team A'};
                const tb = teamsData.teams[m.teamB] || {name:'Team B'};
                return {home:ta.name, away:tb.name};
            });
        }else if(teamsData){
            const ta = teamsData.teams ? teamsData.teams[0]?.name || 'Team A' : teamsData.teamA?.name || 'Team A';
            const tb = teamsData.teams ? teamsData.teams[1]?.name || 'Team B' : teamsData.teamB?.name || 'Team B';
            list = [{home:ta, away:tb}];
        }
        listDiv.innerHTML = list.map((f,i)=>{
            const checked = !existing.length || existing.find(e=>e.home===f.home && e.away===f.away) ? 'checked' : '';
            return `<label class="block"><input type="checkbox" data-idx="${i}" ${checked}> ${f.home} vs ${f.away}</label>`;
        }).join('');
        const styleSel = form.querySelector('select[name="style"]');
        const transSel = form.querySelector('select[name="transition"]');
        styleSel.value = introSettings.fixtures?.style || 'style1';
        transSel.value = introSettings.fixtures?.transition || 'fade';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            const boxes = Array.from(listDiv.querySelectorAll('input[type="checkbox"]'));
            const selected = boxes.filter(b=>b.checked).map(b=>list[parseInt(b.dataset.idx)]);
            introSettings.fixtures = { list:selected, style:styleSel.value, transition:transSel.value };
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#fixtures-cancel').onclick = ()=>{ modal.style.display='none'; };
    }

    function showFormationModal(){
        const modal = container.querySelector('#formation-modal');
        const form = container.querySelector('#formation-form');
        if(!modal || !form) return;
        const styleSel = form.querySelector('select[name="style"]');
        const transSel = form.querySelector('select[name="transition"]');
        styleSel.value = introSettings.formation?.style || 'style1';
        transSel.value = introSettings.formation?.transition || 'fade';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            introSettings.formation = { ...(introSettings.formation||{}), style:styleSel.value, transition:transSel.value };
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#formation-cancel').onclick = ()=>{ modal.style.display='none'; };
    }

    function showCourseModal(){
        const modal = container.querySelector('#course-modal');
        const form = container.querySelector('#course-form');
        if(!modal || !form) return;
        form.name.value = introSettings.course?.name || '';
        form.length.value = introSettings.course?.length || '';
        form.par.value = introSettings.course?.par || '';
        form.image.value = introSettings.course?.image || '';
        const styleSel = form.querySelector('select[name="style"]');
        const transSel = form.querySelector('select[name="transition"]');
        styleSel.value = introSettings.course?.style || 'style1';
        transSel.value = introSettings.course?.transition || 'fade';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            introSettings.course = { name:form.name.value, length:form.length.value, par:form.par.value, image:form.image.value, style:styleSel.value, transition:transSel.value };
            await set(getIntroSettingsRef(eid), introSettings);
            await updateOverlayState(eid,{ holdslateSettings:introSettings });
            modal.style.display='none';
        };
        form.querySelector('#course-cancel').onclick = ()=>{ modal.style.display='none'; };
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
