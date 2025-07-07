import { getBranding, updateBranding } from '../firebase.js';

export function renderBrandingPanel(container, eventId){
    getBranding(eventId).then(branding => {
        branding = branding || { logos:{tl:'',tr:'',bl:'',br:''}, sponsors:[], scheduleSponsorPlacement:'bottom-spaced', scheduleLayout:'corner' };
        container.innerHTML = `
            <div class="space-y-4">
                <div>
                    <h3 class="font-semibold mb-1">Corner Logos</h3>
                    ${['tl','tr','bl','br'].map(pos=>`<div class="mb-1"><label class="text-xs mr-2">${pos.toUpperCase()}</label><input type="file" data-pos="${pos}" class="border p-1" /></div>`).join('')}
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <strong>Sponsors</strong>
                        <button class="control-button btn-sm" id="add-sponsor">Add Sponsor</button>
                    </div>
                    <ul id="sponsor-list" class="space-y-1 text-sm"></ul>
                    <div class="mt-2">
                        <label class="block text-xs mb-1">Schedule Sponsor Placement</label>
                        <select id="schedule-placement" class="border p-1 w-full text-black">
                            <option value="top-right">Top Right</option>
                            <option value="bottom-centered">Bottom Center</option>
                            <option value="bottom-spaced">Bottom Spaced</option>
                            <option value="bottom-sides">Two Sides</option>
                        </select>
                    </div>
                    <div class="mt-2">
                        <label class="block text-xs mb-1">Schedule Layout</label>
                        <select id="schedule-layout" class="border p-1 w-full text-black">
                            <option value="corner">Corner Box</option>
                            <option value="center">Center Box</option>
                        </select>
                    </div>
                </div>
            </div>
            <div id="sponsor-modal" class="modal-overlay" style="display:none;">
                <div class="modal-window">
                    <h3 class="font-bold mb-2">Sponsor</h3>
                    <form id="sponsor-form">
                        <input type="hidden" name="idx" />
                        <div class="mb-2"><input class="border p-1 w-full" name="name" placeholder="Name" required /></div>
                        <div class="mb-2"><input type="file" id="sponsor-logo" /><button type="button" id="upload-logo" class="control-button btn-sm ml-2">Upload</button></div>
                        <div class="mb-2"><input class="border p-1 w-full" name="logo" placeholder="Logo URL" /></div>
                        <div class="flex gap-2"><button class="control-button btn-sm" type="submit">Save</button><button type="button" id="cancel-sponsor" class="control-button btn-sm bg-gray-400">Cancel</button></div>
                        <span id="sponsor-status" class="text-xs ml-2"></span>
                    </form>
                </div>
            </div>`;
        const list = container.querySelector('#sponsor-list');
        const modal = container.querySelector('#sponsor-modal');
        const form = container.querySelector('#sponsor-form');
        function renderSponsors(){
            const sponsors = (branding && Array.isArray(branding.sponsors)) ? branding.sponsors : [];
            list.innerHTML = sponsors.map((s,i)=>`<li class="flex items-center gap-2"><span class="flex-1">${s.name}</span><button class="control-button btn-xs" data-edit="${i}">Edit</button><button class="control-button btn-xs" data-remove="${i}">Remove</button></li>`).join('') || '<li class="text-gray-500">None</li>';
        }
        renderSponsors();
        const placementSel = container.querySelector('#schedule-placement');
        if (placementSel) {
            placementSel.value = branding.scheduleSponsorPlacement || 'bottom-spaced';
            placementSel.onchange = () => { branding.scheduleSponsorPlacement = placementSel.value; save(); };
        }
        const layoutSel = container.querySelector('#schedule-layout');
        if (layoutSel) {
            layoutSel.value = branding.scheduleLayout || 'corner';
            layoutSel.onchange = () => { branding.scheduleLayout = layoutSel.value; save(); };
        }
        container.addEventListener('click', e=>{
            const edit = e.target.getAttribute('data-edit');
            if(edit!==null){ showModal(edit); }
            const rem = e.target.getAttribute('data-remove');
            if(rem!==null){ branding.sponsors.splice(parseInt(rem,10),1); save(); renderSponsors(); }
        });
        container.querySelectorAll('input[type="file"][data-pos]').forEach(inp=>{
            inp.onchange = async ()=>{
                const file=inp.files[0]; if(!file) return; const url=await upload(file,`uploads/${eventId}/branding/${inp.dataset.pos}_${file.name}`); if(url){ branding.logos[inp.dataset.pos]=url; save(); }
            };
        });
        container.querySelector('#add-sponsor').onclick=()=>showModal();
        if(form){
            form.onsubmit=e=>{e.preventDefault(); const data=Object.fromEntries(new FormData(form)); const idx=data.idx?parseInt(data.idx,10):-1; const sponsor={name:data.name,logo:data.logo}; if(idx>=0) branding.sponsors[idx]=sponsor; else branding.sponsors.push(sponsor); save(); renderSponsors(); modal.style.display='none';};
            form.querySelector('#cancel-sponsor').onclick=()=>{modal.style.display='none';};
            form.querySelector('#upload-logo').onclick=async()=>{ const file=document.getElementById('sponsor-logo').files[0]; if(file){ const url=await upload(file,`uploads/${eventId}/branding/sponsors/${file.name}`); if(url) form.logo.value=url; }};
        }
        function showModal(idx){
            form.idx.value= idx ?? '';
            form.name.value= idx!=null ? branding.sponsors[idx].name : '';
            form.logo.value= idx!=null ? branding.sponsors[idx].logo : '';
            document.getElementById('sponsor-logo').value='';
            modal.style.display='flex';
        }
        async function save(){ await updateBranding(eventId, {...branding}); }
    });
}

async function upload(file,path){
    const fd=new FormData();
    fd.append('file',file); fd.append('path',path);
    const resp=await fetch('upload.php',{method:'POST',body:fd});
    if(!resp.ok) return null; const d=await resp.json(); return d.url;
}
