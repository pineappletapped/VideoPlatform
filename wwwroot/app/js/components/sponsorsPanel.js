import { getSponsors, setSponsors, listenSponsors, getSponsorPlacements, setSponsorPlacements, listenSponsorPlacements, getSponsorLog } from '../firebase.js';

async function uploadFile(file, path){
    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', path);
    const resp = await fetch('upload.php', { method:'POST', body: fd });
    if(!resp.ok) return null;
    const d = await resp.json();
    return d.url;
}

export function renderSponsorsPanel(container, eventId){
    let sponsors = [];
    let placements = {};

    listenSponsors(eventId, data=>{ sponsors = data || []; render(); });
    listenSponsorPlacements(eventId, data=>{ placements = data || {}; render(); });

    function render(){
        container.innerHTML = `
            <div class='sponsors-panel'>
                <h2 class="font-bold text-lg mb-2">Sponsorship</h2>
                <div class="mb-4">
                    <div class="flex justify-between items-center mb-1">
                        <strong>Sponsors</strong>
                        <button id="add-sponsor" class="control-button btn-sm">Add</button>
                    </div>
                    <ul id="sponsor-list" class="space-y-1 text-sm"></ul>
                </div>
                <div class="mb-4">
                    <strong class="block mb-1">Placements</strong>
                    <table class="text-sm w-full" id="place-table"></table>
                    <button id="save-placements" class="control-button btn-sm mt-2">Save Placements</button>
                    <button id="view-log" class="control-button btn-sm mt-2 ml-2">View Log</button>
                </div>
                <div id="sponsor-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window">
                        <form id="sponsor-form">
                            <input type="hidden" name="idx" />
                            <div class="mb-2"><input class="border p-1 w-full" name="name" placeholder="Name" required></div>
                            <div class="mb-2 flex gap-2"><input type="color" name="color" value="#ffffff" class="flex-1"><input type="color" name="color2" value="#000000" class="flex-1"></div>
                            <div class="mb-2"><input type="file" id="logo-file"><button type="button" id="upload-logo" class="control-button btn-sm ml-2">Upload</button></div>
                            <div class="mb-2"><input class="border p-1 w-full" name="logo" placeholder="Logo URL"></div>
                            <div class="flex gap-2"><button class="control-button btn-sm" type="submit">Save</button><button type="button" id="cancel" class="control-button btn-sm bg-gray-400">Cancel</button></div>
                        </form>
                    </div>
                </div>
                <div id="log-modal" class="modal-overlay" style="display:none;">
                    <div class="modal-window max-h-[80vh] overflow-y-auto">
                        <h3 class="font-bold mb-2">Sponsor Log</h3>
                        <table class="text-sm w-full" id="log-table"></table>
                        <button id="close-log" class="control-button btn-sm mt-2">Close</button>
                    </div>
                </div>
            </div>`;
        const list = container.querySelector('#sponsor-list');
        list.innerHTML = sponsors.map((s,i)=>`<li class="flex items-center gap-2"><span class="flex-1">${s.name}</span><button class="control-button btn-xs" data-edit="${i}">Edit</button><button class="control-button btn-xs btn-remove" data-remove="${i}">Remove</button></li>`).join('') || '<li class="text-gray-500">None</li>';
        const rows = [
            ['scoreboardTop','Above Scoreboard'],
            ['scoreboardBottom','Below Scoreboard'],
            ['formationBottom','Bottom of Formation'],
            ['substitutionTop','Top of Substitution'],
            ['cornerTL','Top Left Corner'],
            ['cornerTR','Top Right Corner'],
            ['cornerBL','Bottom Left Corner'],
            ['cornerBR','Bottom Right Corner']
        ];
        const placeTable = container.querySelector('#place-table');
        placeTable.innerHTML = rows.map(r=>`<tr><td class="pr-2">${r[1]}</td><td><select data-place="${r[0]}" class="border p-1 w-full"><option value="">None</option>${sponsors.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('')}</select></td></tr>`).join('');
        rows.forEach(r=>{
            const sel = container.querySelector(`select[data-place="${r[0]}"]`);
            if(sel) sel.value = placements[r[0]] ?? '';
        });
        container.querySelector('#save-placements').onclick = async ()=>{
            const data = {};
            rows.forEach(r=>{ const sel = container.querySelector(`select[data-place="${r[0]}"]`); data[r[0]] = sel ? sel.value : ''; });
            await setSponsorPlacements(eventId, data);
        };
        container.querySelector('#view-log').onclick = async ()=>{
            const logsObj = await getSponsorLog(eventId) || {};
            const logs = Object.values(logsObj);
            const modal = container.querySelector('#log-modal');
            const table = container.querySelector('#log-table');
            table.innerHTML = logs.map(l=>`<tr><td class="pr-2">${new Date(l.ts).toLocaleString()}</td><td class="pr-2">${l.placement}</td><td>${sponsors[l.sponsor] ? sponsors[l.sponsor].name : ''} (${l.action})</td></tr>`).join('') || '<tr><td>No log</td></tr>';
            modal.style.display='flex';
        };
        container.querySelector('#close-log').onclick = ()=>{ container.querySelector('#log-modal').style.display='none'; };
        container.querySelector('#add-sponsor').onclick = ()=> showModal();
        list.querySelectorAll('button[data-edit]').forEach(btn=>btn.onclick=()=> showModal(parseInt(btn.dataset.edit,10)));
        list.querySelectorAll('button[data-remove]').forEach(btn=>btn.onclick=async ()=>{ sponsors.splice(parseInt(btn.dataset.remove,10),1); await setSponsors(eventId,sponsors); });
    }

    function showModal(idx){
        const modal = container.querySelector('#sponsor-modal');
        const form = container.querySelector('#sponsor-form');
        form.idx.value = idx!=null?idx:'';
        form.name.value = idx!=null?sponsors[idx].name:'';
        form.color.value = idx!=null?sponsors[idx].color||'#ffffff':'#ffffff';
        form.color2.value = idx!=null?sponsors[idx].color2||'#000000':'#000000';
        form.logo.value = idx!=null?sponsors[idx].logo:'';
        document.getElementById('logo-file').value='';
        modal.style.display='flex';
        form.onsubmit = async e=>{
            e.preventDefault();
            const data = Object.fromEntries(new FormData(form));
            const obj = { name:data.name, logo:data.logo, color:data.color, color2:data.color2 };
            if(data.idx!=='') sponsors[parseInt(data.idx,10)]=obj; else sponsors.push(obj);
            await setSponsors(eventId, sponsors);
            modal.style.display='none';
        };
        form.querySelector('#cancel').onclick = ()=>{ modal.style.display='none'; };
        form.querySelector('#upload-logo').onclick = async()=>{
            const file=document.getElementById('logo-file').files[0]; if(file){ const url=await uploadFile(file,`uploads/${eventId}/sponsors/${file.name}`); if(url) form.logo.value=url; }
        };
    }
}
