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
                <div class='flex gap-2'>
                    <button id='pres-show' class='control-button btn-sm'>Live</button>
                    <button id='pres-hide' class='control-button btn-sm'>Hide</button>
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
        container.querySelector('#pres-show')?.addEventListener('click',()=>{
            const mode = modeSel.value;
            updateOverlayState(eventId,{ presentation: Object.assign({}, data, { mode }), presentationVisible:true, presentationPreviewVisible:false });
        });
        container.querySelector('#pres-hide')?.addEventListener('click',()=>{
            updateOverlayState(eventId,{ presentationVisible:false, presentationPreviewVisible:false });
        });
    }
}
