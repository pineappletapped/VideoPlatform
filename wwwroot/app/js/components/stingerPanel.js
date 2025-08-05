import { listenBranding, listenSponsors, updateOverlayState, resolveAssetPath } from '../firebase.js';
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
        if(branding.logoPrimary) opts.push({label:'Event Primary', logo:resolveAssetPath(branding.logoPrimary), type:'event', invert:false});
        if(branding.logoSecondary) opts.push({label:'Event Secondary', logo:resolveAssetPath(branding.logoSecondary), type:'event', invert:true});
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
            if(tA && tA.logo) opts.push({label:`${tA.name||'Team A'} Logo`, logo:resolveAssetPath(tA.logo), type:'team'});
            if(tB && tB.logo) opts.push({label:`${tB.name||'Team B'} Logo`, logo:resolveAssetPath(tB.logo), type:'team'});
        }
        (sponsors||[]).forEach((s,i)=>{ if(s.logo) opts.push({label:`Sponsor: ${s.name}`, logo:resolveAssetPath(s.logo), type:'sponsor', sponsorIndex:i}); });
        opts.push({label:'Replay', text:'REPLAY', type:'replay'});
        return opts;
    }

    function render(){
        const options = buildOptions();
        container.innerHTML = `
            <div class='stinger-panel'>
                <h2 class="font-bold text-lg mb-2">Stinger</h2>
                <div class="mb-2">
                    <label class="block text-sm">Choose Stinger</label>
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
                <div class="mb-2 hidden" id="stinger-color-controls">
                    <label class="block text-sm">Colour Source</label>
                    <select id="stinger-color-src" class="border p-1 w-full">
                        <option value="event">Event</option>
                        <option value="sponsor">Sponsor</option>
                        <option value="custom">Custom</option>
                    </select>
                    <div class="mt-2 hidden" id="stinger-sponsor-picker">
                        <select id="stinger-sponsor-select" class="border p-1 w-full">
                            ${sponsors.map((s,i)=>`<option value="${i}">${s.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="mt-2 hidden flex gap-2" id="stinger-custom-colors">
                        <input id="stinger-color1" type="color" class="border p-1 w-full" value="#000000">
                        <input id="stinger-color2" type="color" class="border p-1 w-full" value="#ffffff">
                    </div>
                </div>
                <div class="flex gap-2">
                    <button id="stinger-preview" class="control-button btn-sm">Preview</button>
                    <button id="stinger-live" class="control-button btn-sm">Live</button>
                </div>
            </div>`;
        const sel = container.querySelector('#stinger-select');
        const styleSel = container.querySelector('#stinger-style');
        const colorControls = container.querySelector('#stinger-color-controls');
        const colorSrcSel = container.querySelector('#stinger-color-src');
        const sponsorPicker = container.querySelector('#stinger-sponsor-picker');
        const sponsorSel = container.querySelector('#stinger-sponsor-select');
        const customColors = container.querySelector('#stinger-custom-colors');
        const color1Inp = container.querySelector('#stinger-color1');
        const color2Inp = container.querySelector('#stinger-color2');
        const previewBtn = container.querySelector('#stinger-preview');
        const liveBtn = container.querySelector('#stinger-live');
        let previewing = false;
        let living = false;
        const STINGER_DURATION = 2100;
        function updateColorControls(){
            const opt = options[parseInt(sel.value||'0',10)];
            if(opt && opt.type==='replay') colorControls.classList.remove('hidden');
            else colorControls.classList.add('hidden');
        }
        if(sel) sel.onchange = updateColorControls;
        updateColorControls();
        if(colorSrcSel) colorSrcSel.onchange = () => {
            sponsorPicker.classList.toggle('hidden', colorSrcSel.value !== 'sponsor');
            customColors.classList.toggle('hidden', colorSrcSel.value !== 'custom');
        };

        function resolveColors(opt){
            if(opt.type==='replay'){
                const src = colorSrcSel.value;
                if(src==='event') return [branding.primaryColor||'#000000', branding.secondaryColor1||'#ffffff'];
                if(src==='sponsor'){
                    const sp = sponsors[parseInt(sponsorSel.value||'0',10)] || {};
                    return [sp.color||'#000000', sp.color2||'#ffffff'];
                }
                return [color1Inp.value, color2Inp.value];
            }
            if(opt.type==='event'){
                let c1 = branding.primaryColor||'#000000';
                let c2 = branding.secondaryColor1||'#ffffff';
                if(opt.invert){ [c1,c2] = [c2,c1]; }
                return [c1,c2];
            }
            if(opt.type==='sponsor'){
                const sp = sponsors[opt.sponsorIndex] || {};
                return [sp.color||'#000000', sp.color2||'#ffffff'];
            }
            return [branding.primaryColor||'#000000', branding.secondaryColor1||'#ffffff'];
        }

        if(previewBtn) previewBtn.onclick = () => {
            const opt = options[parseInt(sel.value||'0',10)];
            if(previewing){
                updateOverlayState(eventId,{stingerPreviewVisible:false});
                previewing = false;
            } else if(opt){
                const colors = resolveColors(opt);
                const stingerData = { style: styleSel.value, colors };
                if (opt.logo) stingerData.logo = opt.logo;
                if (opt.text) stingerData.text = opt.text;
                updateOverlayState(eventId,{stinger:stingerData,stingerPreviewVisible:true,stingerVisible:false});
                previewing = true;
                living = false;
                setTimeout(()=>{ previewing = false; }, STINGER_DURATION);
            }
        };
        if(liveBtn) liveBtn.onclick = () => {
            const opt = options[parseInt(sel.value||'0',10)];
            if(living){
                updateOverlayState(eventId,{stingerVisible:false});
                living = false;
            } else if(opt){
                const colors = resolveColors(opt);
                const stingerData = { style: styleSel.value, colors };
                if (opt.logo) stingerData.logo = opt.logo;
                if (opt.text) stingerData.text = opt.text;
                updateOverlayState(eventId,{stinger:stingerData,stingerVisible:true,stingerPreviewVisible:false});
                living = true;
                previewing = false;
                setTimeout(()=>{ living = false; }, STINGER_DURATION);
            }
        };
    }
}
