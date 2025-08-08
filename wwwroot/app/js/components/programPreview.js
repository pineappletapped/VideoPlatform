import { updateOverlayState, listenOverlayState, listenSpeakers } from '../firebase.js';

let liveProgramVisible = false;
let previewProgramVisible = false;
let programData = null;
let speakersList = [];

function saveProgramData(eventId, program) {
    programData = program;
    updateOverlayState(eventId, { program });
}

function loadProgramData(eventId, fallback, callback) {
    let first = true;
    listenOverlayState(eventId, (state) => {
        if (state && state.program) {
            callback(state.program, state.liveProgramVisible, state.previewProgramVisible);
        } else {
            callback(fallback, false, false);
            if (first && fallback) updateOverlayState(eventId, { program: fallback });
        }
        first = false;
    });
}

function saveLiveProgramVisible(eventId, visible) {
    liveProgramVisible = visible;
    updateOverlayState(eventId, { liveProgramVisible: visible });
}

function savePreviewProgramVisible(eventId, visible) {
    previewProgramVisible = visible;
    updateOverlayState(eventId, { previewProgramVisible: visible });
}

export function renderProgramPreview(container, eventData, onOverlayStateChange) {
    const eventId = eventData.id || 'demo';

    function render(){
        if(!programData) return;
        const speakerOptions = speakersList.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
        const modalHtml = `
            <div id="program-modal" class="modal-overlay" style="display:none;">
                <div class="modal-window">
                    <h3 class="font-bold text-lg mb-2">Edit Schedule</h3>
                    <form id="program-form">
                        <div id="program-items">
                            ${programData.map((item, idx) => `
                                <div class="flex gap-2 mb-2 items-center" data-idx="${idx}">
                                    <input class="border p-1 w-16" name="time" value="${item.time||''}" required />
                                    <input class="border p-1 flex-1" name="title" value="${item.title||''}" required />
                                    <select name="type" class="border p-1">
                                        <option value="presentation"${item.type==='presentation'?' selected':''}>Stage Presentation</option>
                                        <option value="breakout"${item.type==='breakout'?' selected':''}>Breakout Session</option>
                                        <option value="lunch"${item.type==='lunch'?' selected':''}>Lunch</option>
                                        <option value="break"${item.type==='break'?' selected':''}>Break</option>
                                        <option value="other"${item.type==='other'?' selected':''}>Other</option>
                                    </select>
                                    <select name="speakers" multiple class="border p-1 flex-1">
                                        ${speakersList.map(sp=>`<option value="${sp.name}"${item.speakers&&item.speakers.includes(sp.name)?' selected':''}>${sp.name}</option>`).join('')}
                                    </select>
                                    <button type="button" class="control-button btn-sm btn-remove" data-action="remove" data-idx="${idx}">Remove</button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="control-button btn-sm" id="add-program-item">Add Line</button>
                        <div class="flex gap-2 mt-4">
                            <button type="submit" class="control-button btn-sm">Save</button>
                            <button type="button" id="program-cancel" class="control-button btn-sm bg-gray-400 hover:bg-gray-600">Cancel</button>
                        </div>
                    </form>
                </div>
            </div>`;
        container.innerHTML = `
            <div class='program-preview'>
                <div class="flex items-center justify-between mb-2">
                    <h2 class="font-bold text-lg">Schedule</h2>
                    <div>
                        <button class="control-button btn-sm btn-preview${previewProgramVisible ? ' ring-2 ring-brand' : ''}" id="preview-program">Preview</button>
                        <button class="control-button btn-sm btn-live${liveProgramVisible ? ' ring-2 ring-green-400' : ''}" id="take-program">Live</button>
                        <button class="control-button btn-sm${!liveProgramVisible && !previewProgramVisible ? ' ring-2 ring-red-400' : ''}" id="hide-program">Hide</button>
                        <button class="control-button btn-sm" id="edit-program">Edit</button>
                    </div>
                </div>
                <table class="min-w-full text-sm">
                    <thead><tr><th class="text-left">Time</th><th class="text-left">Title</th><th class="text-left">Type</th><th class="text-left">Speakers</th><th></th></tr></thead>
                    <tbody>
                        ${programData.map((item, idx) => `
                            <tr class="${item.done ? 'line-through text-gray-400' : ''}">
                                <td class="pr-4">${item.time}</td>
                                <td class="pr-4">${item.title}</td>
                                <td class="pr-4">${item.type || ''}</td>
                                <td class="pr-4">${(item.speakers||[]).join(', ')}</td>
                                <td><input type="checkbox" class="schedule-done" data-idx="${idx}"${item.done?' checked':''}></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${modalHtml}
            </div>`;
        container.querySelectorAll('.schedule-done').forEach(cb=>{
            cb.addEventListener('change', e=>{
                const idx = parseInt(cb.getAttribute('data-idx'),10);
                programData[idx].done = cb.checked;
                saveProgramData(eventId, programData);
                render();
                if(onOverlayStateChange) onOverlayStateChange({ program: programData });
            });
        });
        const modal = container.querySelector('#program-modal');
        const form = container.querySelector('#program-form');
        if(modal){
            container.querySelector('#program-cancel').onclick = ()=>{ modal.style.display='none'; };
            form.onsubmit = e=>{
                e.preventDefault();
                const items = Array.from(form.querySelectorAll('#program-items > div')).map(row=>{
                    const time = row.querySelector('input[name="time"]').value;
                    const title = row.querySelector('input[name="title"]').value;
                    const type = row.querySelector('select[name="type"]').value;
                    const speakers = Array.from(row.querySelector('select[name="speakers"]').selectedOptions).map(o=>o.value);
                    const originalIdx = parseInt(row.getAttribute('data-idx'),10);
                    const done = programData[originalIdx]?.done || false;
                    return { time, title, type, speakers, done };
                });
                saveProgramData(eventId, items);
                modal.style.display='none';
                programData = items;
                render();
                if(onOverlayStateChange) onOverlayStateChange({ program: items });
            };
            form.querySelectorAll('button[data-action="remove"]').forEach(btn=>{
                btn.onclick = ()=>{
                    const idx = parseInt(btn.getAttribute('data-idx'),10);
                    programData.splice(idx,1);
                    saveProgramData(eventId, programData);
                    render();
                    setTimeout(()=>{ modal.style.display='flex'; },10);
                    if(onOverlayStateChange) onOverlayStateChange({ program: programData });
                };
            });
            container.querySelector('#add-program-item').onclick = ()=>{
                programData.push({ time:'', title:'', type:'presentation', speakers:[], done:false });
                saveProgramData(eventId, programData);
                render();
                setTimeout(()=>{ modal.style.display='flex'; },10);
                if(onOverlayStateChange) onOverlayStateChange({ program: programData });
            };
        }
        container.querySelector('#preview-program').onclick = ()=>{
            saveProgramData(eventId, programData);
            savePreviewProgramVisible(eventId, true);
            if(onOverlayStateChange) onOverlayStateChange({ previewProgramVisible:true, program: programData });
        };
        container.querySelector('#take-program').onclick = ()=>{
            saveProgramData(eventId, programData);
            saveLiveProgramVisible(eventId, true);
            savePreviewProgramVisible(eventId, false);
            render();
            if(onOverlayStateChange) onOverlayStateChange({ liveProgramVisible:true, previewProgramVisible:false, program: programData });
        };
        container.querySelector('#hide-program').onclick = ()=>{
            saveLiveProgramVisible(eventId, false);
            savePreviewProgramVisible(eventId, false);
            render();
            if(onOverlayStateChange) onOverlayStateChange({ liveProgramVisible:false, previewProgramVisible:false, program: programData });
        };
        container.querySelector('#edit-program').onclick = ()=>{ modal.style.display='flex'; };
    }

    loadProgramData(eventId, eventData.program || [], (loadedProgram, liveVisible, previewVisible)=>{
        programData = loadedProgram || [];
        liveProgramVisible = liveVisible;
        previewProgramVisible = previewVisible;
        render();
    });
    listenSpeakers(eventId, sp=>{ speakersList = sp || []; render(); });
}