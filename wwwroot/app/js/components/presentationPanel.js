import { listenPresentation, updatePresentation, updateOverlayState } from '../firebase.js';
import { getDatabaseInstance } from '../firebaseApp.js';
import { ref } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

export function renderPresentationPanel(container, eventId){
    let data = null;
    const db = getDatabaseInstance();
    listenPresentation(eventId, d=>{ data = d || {}; render(); });

    async function uploadToServer(file){
        const fd = new FormData();
        fd.append('file', file);
        fd.append('path', `uploads/${eventId}/presentation/${file.name}`);
        const resp = await fetch('upload.php',{ method:'POST', body: fd });
        if(!resp.ok) return null;
        const j = await resp.json().catch(()=>null);
        return j && j.url;
    }

    function render(){
        container.innerHTML = `
            <div class='presentation-panel'>
                <h2 class='font-bold text-lg mb-2'>Presentation</h2>
                <div class='mb-2 flex gap-2 items-center'>
                    <input type='file' id='pres-file' accept='.pdf,.ppt,.pptx' class='text-sm flex-1'>
                    <button id='pres-upload' class='control-button btn-sm'>Upload</button>
                </div>
                ${data && data.url ? `<div class='mb-2 text-sm'>Current: <a href='${data.url}' target='_blank'>File</a> (page ${data.page||1})</div>` : ''}
                <div class='mb-2'>
                    <label class='block text-sm'>Mode</label>
                    <select id='pres-mode' class='border p-1 w-full'>
                        <option value='full'>Full Screen</option>
                        <option value='pip'>Picture in Picture</option>
                    </select>
                </div>
                <div class='flex gap-2 mb-2'>
                    <button id='pres-prev' class='control-button btn-sm'>Prev</button>
                    <button id='pres-next' class='control-button btn-sm'>Next</button>
                    <button id='pres-show' class='control-button btn-sm'>Live</button>
                    <button id='pres-hide' class='control-button btn-sm'>Hide</button>
                    <button id='pres-edit' class='control-button btn-sm'>Edit</button>
                </div>
                <div id='pres-modal' class='modal-overlay' style='display:none;'>
                    <div class='modal-window'>
                        <div class='mb-2'>
                            <label class='block text-sm'>Left (%)</label>
                            <input type='number' id='pip-x' class='border p-1 w-full' min='0' max='100'>
                        </div>
                        <div class='mb-2'>
                            <label class='block text-sm'>Top (%)</label>
                            <input type='number' id='pip-y' class='border p-1 w-full' min='0' max='100'>
                        </div>
                        <div class='mb-2'>
                            <label class='block text-sm'>Width (%)</label>
                            <input type='number' id='pip-w' class='border p-1 w-full' min='1' max='100'>
                        </div>
                        <div class='mb-4'>
                            <label class='block text-sm'>Height (%)</label>
                            <input type='number' id='pip-h' class='border p-1 w-full' min='1' max='100'>
                        </div>
                        <div class='flex gap-2'>
                            <button id='pip-save' class='control-button btn-sm'>Save</button>
                            <button id='pip-cancel' class='control-button btn-sm bg-gray-400 hover:bg-gray-600'>Cancel</button>
                        </div>
                    </div>
                </div>
            </div>`;
        const modeSel = container.querySelector('#pres-mode');
        if(modeSel && data && data.mode) modeSel.value = data.mode;
        container.querySelector('#pres-upload')?.addEventListener('click', async()=>{
            const file = container.querySelector('#pres-file').files[0];
            if(!file) return;
            const url = await uploadToServer(file);
            if(url){
                data = { url, page:1, mode: modeSel.value || 'full' };
                await updatePresentation(eventId, data);
            }
        });
        container.querySelector('#pres-prev')?.addEventListener('click',()=>{
            if(!data || !data.url) return;
            if((data.page||1) > 1){
                data.page -= 1;
                updatePresentation(eventId,{ page:data.page });
                updateOverlayState(eventId,{ presentation:Object.assign({}, data) });
                render();
            }
        });
        container.querySelector('#pres-next')?.addEventListener('click',()=>{
            if(!data || !data.url) return;
            data.page = (data.page||1) + 1;
            updatePresentation(eventId,{ page:data.page });
            updateOverlayState(eventId,{ presentation:Object.assign({}, data) });
            render();
        });
        container.querySelector('#pres-show')?.addEventListener('click',()=>{
            const mode = modeSel.value;
            updateOverlayState(eventId,{ presentation: Object.assign({}, data, { mode }), presentationVisible:true, presentationPreviewVisible:false });
        });
        container.querySelector('#pres-hide')?.addEventListener('click',()=>{
            updateOverlayState(eventId,{ presentationVisible:false, presentationPreviewVisible:false });
        });
        container.querySelector('#pres-edit')?.addEventListener('click',()=>{
            const modal = container.querySelector('#pres-modal');
            if(!modal) return;
            modal.style.display='flex';
            modal.querySelector('#pip-x').value = data?.x ?? 60;
            modal.querySelector('#pip-y').value = data?.y ?? 60;
            modal.querySelector('#pip-w').value = data?.w ?? 40;
            modal.querySelector('#pip-h').value = data?.h ?? 40;
        });
        const modal = container.querySelector('#pres-modal');
        modal?.querySelector('#pip-cancel')?.addEventListener('click',()=>{ modal.style.display='none'; });
        modal?.querySelector('#pip-save')?.addEventListener('click',async()=>{
            if(!data) data = {};
            data.x = parseFloat(modal.querySelector('#pip-x').value)||0;
            data.y = parseFloat(modal.querySelector('#pip-y').value)||0;
            data.w = parseFloat(modal.querySelector('#pip-w').value)||40;
            data.h = parseFloat(modal.querySelector('#pip-h').value)||40;
            await updatePresentation(eventId,{ x:data.x, y:data.y, w:data.w, h:data.h });
            await updateOverlayState(eventId,{ presentation:Object.assign({}, data) });
            modal.style.display='none';
        });
    }
}
