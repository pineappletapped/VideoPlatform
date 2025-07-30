import { requireAuth, logout } from './auth.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { listenPresentation, updatePresentation, updateOverlayState, getEventMetadata } from './firebase.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';
let pres = null;

async function uploadToServer(file){
    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', `uploads/${eventId}/presentation/${file.name}`);
    const resp = await fetch('upload.php',{ method:'POST', body: fd });
    if(!resp.ok) return null;
    const j = await resp.json().catch(()=>null);
    return j && j.url;
}

async function init(user){
    const ev = await getEventMetadata(eventId) || {};
    const tb = document.createElement('top-bar');
    tb.setAttribute('event-name', ev.title || eventId);
    tb.addEventListener('logout', logout);
    document.getElementById('top-bar').appendChild(tb);
    renderStatusBar(document.getElementById('status-bar'), { id:eventId, status:'Speakers', firebaseStatus:'Connected' }, { overlay:false, listener:false, sport:false, clock:true, atem:false, obs:false });

    listenPresentation(eventId, data=>{ pres = data || {}; render(); });

    function render(){
        const viewer = document.getElementById('viewer');
        viewer.innerHTML = pres && pres.url ? `<iframe src='${pres.url}#page=${pres.page||1}' class='w-full h-full'></iframe>` : '<div class="text-gray-500 p-4">No presentation uploaded.</div>';
        const notesArea = document.getElementById('notes');
        if(notesArea) notesArea.value = pres?.notes?.[pres.page||1] || '';
    }

    document.getElementById('upload-btn').onclick = async()=>{
        const file = document.getElementById('file').files[0];
        if(!file) return;
        const url = await uploadToServer(file);
        if(url){
            pres = { url, page:1, mode:'full', notes:{} };
            await updatePresentation(eventId, pres);
        }
    };

    document.getElementById('prev').onclick = ()=>{
        if(!pres || !pres.url) return;
        if(pres.page>1){ pres.page--; updatePresentation(eventId,{ page: pres.page }); render(); }
    };
    document.getElementById('next').onclick = ()=>{
        if(!pres || !pres.url) return;
        pres.page = (pres.page||1)+1; // naive increment
        updatePresentation(eventId,{ page: pres.page });
        render();
    };
    document.getElementById('show-full').onclick = ()=>{
        if(!pres || !pres.url) return;
        updateOverlayState(eventId,{ presentation:{ url: pres.url, page: pres.page, mode:'full' }, presentationVisible:true, presentationPreviewVisible:false });
    };
    document.getElementById('show-pip').onclick = ()=>{
        if(!pres || !pres.url) return;
        updateOverlayState(eventId,{ presentation:{ url: pres.url, page: pres.page, mode:'pip' }, presentationVisible:true, presentationPreviewVisible:false });
    };
    document.getElementById('hide').onclick = ()=>{
        updateOverlayState(eventId,{ presentationVisible:false, presentationPreviewVisible:false });
    };
    document.getElementById('notes').addEventListener('input', e=>{
        if(!pres) return;
        if(!pres.notes) pres.notes = {};
        pres.notes[pres.page||1] = e.target.value;
        updatePresentation(eventId,{ notes: pres.notes });
    });
}

requireAuth(`speakers.html?event_id=${eventId}`).then(u=>init(u));
