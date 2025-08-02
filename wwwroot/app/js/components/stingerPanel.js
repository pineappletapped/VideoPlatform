import { listenBranding, listenSponsors, updateOverlayState } from '../firebase.js';
import { getDatabaseInstance } from '../firebaseApp.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

export function renderStingerPanel(container, eventId){
    const db = getDatabaseInstance();
    let branding = {};
    let teams = null;
    let sponsors = [];

    listenBranding(eventId, b=>{ branding = b || {}; render(); });
    onValue(ref(db, `teams/${eventId}`), snap => { teams = snap.val(); render(); });
    listenSponsors(eventId, data=>{ sponsors = data || []; render(); });

    function buildOptions(){
        const opts = [];
        if(branding.logoPrimary) opts.push({label:'Event Primary', logo:branding.logoPrimary});
        if(branding.logoSecondary) opts.push({label:'Event Secondary', logo:branding.logoSecondary});
        if(teams){
            const getTeam = idx => {
                if(teams.teams){
                    const sel = idx===0 ? teams.currentA||0 : teams.currentB||1;
                    return teams.teams[sel] || null;
                }
                return idx===0 ? teams.teamA : teams.teamB;
            };
            const tA = getTeam(0);
            const tB = getTeam(1);
            if(tA && tA.logo) opts.push({label:`${tA.name||'Team A'} Logo`, logo:tA.logo});
            if(tB && tB.logo) opts.push({label:`${tB.name||'Team B'} Logo`, logo:tB.logo});
        }
        (sponsors||[]).forEach(s=>{ if(s.logo) opts.push({label:`Sponsor: ${s.name}`, logo:s.logo}); });
        return opts;
    }

    function render(){
        const options = buildOptions();
        container.innerHTML = `
            <div class='stinger-panel'>
                <h2 class="font-bold text-lg mb-2">Logo Stinger</h2>
                <div class="mb-2">
                    <label class="block text-sm">Logo Source</label>
                    <select id="stinger-select" class="border p-1 w-full">
                        ${options.map((o,i)=>`<option value="${i}">${o.label}</option>`).join('')}
                    </select>
                </div>
                <div class="mb-2">
                    <label class="block text-sm">Style</label>
                    <select id="stinger-style" class="border p-1 w-full">
                        <option value="logo">Logo Only</option>
                        <option value="split">Split Slide</option>
                    </select>
                </div>
                <div class="mb-2">
                    <label class="block text-sm">Colour</label>
                    <input id="stinger-color" type="color" class="border p-1 w-full" value="#000000">
                </div>
                <div class="flex gap-2">
                    <button id="stinger-preview" class="control-button btn-sm">Preview</button>
                    <button id="stinger-live" class="control-button btn-sm">Live</button>
                </div>
            </div>`;
        const sel = container.querySelector('#stinger-select');
        const styleSel = container.querySelector('#stinger-style');
        const colorInp = container.querySelector('#stinger-color');
        const previewBtn = container.querySelector('#stinger-preview');
        const liveBtn = container.querySelector('#stinger-live');
        let previewing = false;
        let living = false;
        if(previewBtn) previewBtn.onclick = () => {
            const opt = options[parseInt(sel.value||'0',10)];
            if(previewing){
                updateOverlayState(eventId,{stingerPreviewVisible:false});
                previewing = false;
            } else if(opt){
                updateOverlayState(eventId,{stinger:{logo:opt.logo,style:styleSel.value,color:colorInp.value},stingerPreviewVisible:true,stingerVisible:false});
                previewing = true;
                living = false;
            }
        };
        if(liveBtn) liveBtn.onclick = () => {
            const opt = options[parseInt(sel.value||'0',10)];
            if(living){
                updateOverlayState(eventId,{stingerVisible:false});
                living = false;
            } else if(opt){
                updateOverlayState(eventId,{stinger:{logo:opt.logo,style:styleSel.value,color:colorInp.value},stingerVisible:true,stingerPreviewVisible:false});
                living = true;
                previewing = false;
            }
        };
    }
}
