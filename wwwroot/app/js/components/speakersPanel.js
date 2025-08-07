import { listenSpeakers, setSpeakers } from '../firebase.js';

export function renderSpeakersPanel(container, eventId){
    let speakers = [];
    listenSpeakers(eventId, data=>{ speakers = data || []; render(); });

    async function uploadToServer(file){
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', `uploads/${eventId}/speakers/${file.name}`);
        const resp = await fetch('upload.php',{ method:'POST', body: fd });
        if(!resp.ok) return null;
        const j = await resp.json().catch(()=>null);
        return j && j.url;
    }

    function addSpeaker(){
        speakers.push({ id: Date.now(), name:'', organisation:'', position:'', photo:'', host:false });
        setSpeakers(eventId, speakers);
    }

    function removeSpeaker(id){
        speakers = speakers.filter(s=>s.id!==id);
        setSpeakers(eventId, speakers);
    }

    function setHost(id){
        speakers = speakers.map(s=> Object.assign({}, s, { host: s.id === id }));
        setSpeakers(eventId, speakers);
    }

    function updateField(id, field, value){
        const sp = speakers.find(s=>s.id===id);
        if(sp){ sp[field] = value; setSpeakers(eventId, speakers); }
    }

    function render(){
        if(!container) return;
        container.innerHTML = `
            <div>
                <h2 class="font-bold text-lg mb-2">Speakers</h2>
                <div class="flex flex-col gap-2">
                    ${speakers.map(s=>`
                        <div class="flex items-center gap-2 border-b pb-2" data-id="${s.id}">
                            <input class="border p-1 flex-1" placeholder="Name" value="${s.name||''}" data-field="name">
                            <input class="border p-1 flex-1" placeholder="Organisation" value="${s.organisation||''}" data-field="organisation">
                            <input class="border p-1 flex-1" placeholder="Position" value="${s.position||''}" data-field="position">
                            <div class="flex items-center gap-1">
                                <img src="${s.photo||''}" class="h-8 w-8 object-cover" />
                                <input type="file" data-field="photo" class="hidden" accept="image/*">
                                <button class="control-button btn-sm upload-photo">Upload</button>
                            </div>
                            <label class="flex items-center gap-1"><input type="radio" name="host" ${s.host?'checked':''} class="host-radio"> Host</label>
                            <button class="control-button btn-sm bg-red-600 remove-speaker">Remove</button>
                        </div>
                    `).join('')}
                </div>
                <button id="add-speaker" class="control-button btn-sm mt-2">Add Speaker</button>
            </div>
        `;
        container.querySelector('#add-speaker')?.addEventListener('click', addSpeaker);
        container.querySelectorAll('.remove-speaker').forEach(btn=>{
            btn.addEventListener('click',()=>{
                const id = parseInt(btn.closest('[data-id]').dataset.id,10);
                removeSpeaker(id);
            });
        });
        container.querySelectorAll('input[data-field]').forEach(inp=>{
            inp.addEventListener('input', e=>{
                const id = parseInt(e.target.closest('[data-id]').dataset.id,10);
                const field = e.target.getAttribute('data-field');
                updateField(id, field, e.target.value);
            });
        });
        container.querySelectorAll('.upload-photo').forEach(btn=>{
            btn.addEventListener('click',async()=>{
                const row = btn.closest('[data-id]');
                const fileInput = row.querySelector('input[data-field="photo"]');
                fileInput.click();
                fileInput.onchange = async()=>{
                    const file = fileInput.files[0];
                    if(file){
                        const url = await uploadToServer(file);
                        if(url){
                            const id = parseInt(row.dataset.id,10);
                            updateField(id, 'photo', url);
                        }
                    }
                };
            });
        });
        container.querySelectorAll('.host-radio').forEach(r=>{
            r.addEventListener('change', e=>{
                const id = parseInt(e.target.closest('[data-id]').dataset.id,10);
                setHost(id);
            });
        });
    }
}

