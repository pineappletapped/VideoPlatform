import { listenOverlayState, updateOverlayState, listenGraphicsData, updateGraphicsData, listenMatchLog, updateMatchLogEntry, listenSponsors, listenSponsorPlacements, listenTeams, getEventMetadata } from '../firebase.js';
import { listenFavorites, updateFavorites } from '../firebase.js';
import { renderSponsorsPanel } from './sponsorsPanel.js';

export function renderActiveGraphicsPanel(container, eventId, mode = 'live') {
    let overlayState = {};
    let graphicsData = {};
    let sponsors = [];
    let sponsorPlacements = {};
    let favorites = { lowerThirds: [], titleSlides: [], scoreboard: false, stingers: [], shortcuts: {}, sponsors: [] };
    let matchLogs = [];
    let teamsData = null;
    let logVisible = false;
    let favRenderItems = [];
    let sponsorPlacementLabels = { scoreboardTop:'Above Scoreboard', scoreboardBottom:'Below Scoreboard', formationBottom:'Bottom of Formation', substitutionTop:'Top of Substitution', cornerTL:'Top Left Corner', cornerTR:'Top Right Corner', cornerBL:'Bottom Left Corner', cornerBR:'Bottom Right Corner', intro:'Intro Graphic', presentationTop:'Above Presentation' };

    getEventMetadata(eventId).then(meta=>{
        if(meta && meta.eventType && meta.eventType !== 'sports'){
            sponsorPlacementLabels = { intro:'Info Window', cornerTL:'Top Left Corner', cornerTR:'Top Right Corner', cornerBL:'Bottom Left Corner', cornerBR:'Bottom Right Corner', presentationTop:'Above Presentation' };
            render();
            renderFav();
        }
    });

    function assignShortcut(idx, key){
        const fav = favRenderItems[idx];
        if(!fav) return;
        if(!favorites.shortcuts) favorites.shortcuts = {};
        Object.keys(favorites.shortcuts).forEach(k=>{
            const sc = favorites.shortcuts[k];
            if(k===key) delete favorites.shortcuts[k];
            else if(sc && sc.type===fav.type && sc.id===fav.id && sc.idx===fav.idx && sc.placement===fav.placement) delete favorites.shortcuts[k];
        });
        if(key){
            favorites.shortcuts[key] = { type:fav.type };
            if(fav.id) favorites.shortcuts[key].id = fav.id;
            if(typeof fav.idx !== 'undefined') favorites.shortcuts[key].idx = fav.idx;
            if(fav.placement) favorites.shortcuts[key].placement = fav.placement;
        }
        updateFavorites(eventId,favorites);
        renderFav();
    }

    function handleShortcut(key){
        const sc = favorites.shortcuts && favorites.shortcuts[key];
        if(!sc) return false;
        if(sc.type==='lowerThird'){
            if(graphicsData.liveLowerThirdId===sc.id) updateGraphicsData(eventId,{liveLowerThirdId:null}, mode);
            else updateGraphicsData(eventId,{liveLowerThirdId:sc.id}, mode);
        } else if(sc.type==='titleSlide'){
            if(graphicsData.liveTitleSlideId===sc.id) updateGraphicsData(eventId,{liveTitleSlideId:null}, mode);
            else updateGraphicsData(eventId,{liveTitleSlideId:sc.id}, mode);
        } else if(sc.type==='scoreboard'){
            if(overlayState.scoreboardVisible || overlayState.scoreboardPreviewVisible) updateOverlayState(eventId,{scoreboardVisible:false,scoreboardPreviewVisible:false});
            else updateOverlayState(eventId,{scoreboardVisible:true,scoreboardPreviewVisible:false});
        } else if(sc.type==='stinger'){
            const st = favorites.stingers[sc.idx];
            if(st) updateOverlayState(eventId,{stinger:st,stingerVisible:true,stingerPreviewVisible:false});
        } else if(sc.type==='sponsor'){
            const lp = { ...(overlayState.sponsorPlacementsLive || {}) };
            lp[sc.placement] = !lp[sc.placement];
            updateOverlayState(eventId,{sponsorPlacementsLive:lp});
        } else {
            return false;
        }
        return true;
    }

    container.innerHTML = `
        <div class="flex border-b mb-2">
            <button class="px-4 py-2 border-b-2 border-brand text-brand font-semibold" data-tab="active">Active</button>
            <button class="px-4 py-2" data-tab="favourites">Favourites</button>
            <button class="px-4 py-2" data-tab="logs">Logs</button>
            <button class="px-4 py-2" data-tab="sponsors">Sponsors</button>
        </div>
        <div id="active-tab" class="tab-content">
            <ul id="active-list" class="space-y-1 text-sm"></ul>
            <button id="hide-selected" class="control-button btn-sm mt-2">Hide Selected</button>
        </div>
        <div id="fav-tab" class="tab-content hidden">
            <ul id="fav-list" class="space-y-1 text-sm"></ul>
            <button id="fav-live" class="control-button btn-sm mt-2">Live Selected</button>
        </div>
        <div id="logs-tab" class="tab-content hidden">
            <table class="text-sm w-full mb-2" id="logs-table"></table>
            <button id="logs-toggle" class="control-button btn-sm">Toggle Overlay</button>
        </div>
        <div id="sponsors-tab" class="tab-content hidden"></div>`;

    const activeList = container.querySelector('#active-list');
    const favList = container.querySelector('#fav-list');
    const logsTable = container.querySelector('#logs-table');

    renderLog();
    const sponsorsContainer = container.querySelector('#sponsors-tab');
    if (sponsorsContainer) {
        renderSponsorsPanel(sponsorsContainer, eventId);
    }

    function setTab(name){
        ['active','favourites','logs','sponsors'].forEach(t=>{
            const btn = container.querySelector(`[data-tab="${t}"]`);
            if(btn){
                btn.classList.toggle('border-b-2', t===name);
                btn.classList.toggle('border-brand', t===name);
                btn.classList.toggle('text-brand', t===name);
            }
            const panelId = t==='active'?'active':t==='favourites'?'fav':t==='logs'?'logs':'sponsors';
            const panel = container.querySelector(`#${panelId}-tab`);
            if(panel) panel.classList.toggle('hidden', t!==name);
        });
    }
    container.querySelectorAll('[data-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.getAttribute('data-tab'))));
    setTab('active');

    container.addEventListener('click', e=>{
        const hideType = e.target.getAttribute('data-hide');
        const placement = e.target.getAttribute('data-placement');
        if(hideType){ hideItem(hideType, placement); }
        const previewType = e.target.getAttribute('data-preview');
        const liveType = e.target.getAttribute('data-live');
        const id = e.target.getAttribute('data-id');
        const idx = e.target.getAttribute('data-idx');
        if(previewType){
            if(previewType==='lowerThird' && id){
                if(graphicsData.previewLowerThirdId===id) updateGraphicsData(eventId,{previewLowerThirdId:null}, mode);
                else updateGraphicsData(eventId,{previewLowerThirdId:id}, mode);
            }
            else if(previewType==='titleSlide' && id){
                if(graphicsData.previewTitleSlideId===id) updateGraphicsData(eventId,{previewTitleSlideId:null}, mode);
                else updateGraphicsData(eventId,{previewTitleSlideId:id}, mode);
            }
            else if(previewType==='scoreboard'){
                updateOverlayState(eventId,{scoreboardPreviewVisible:!overlayState.scoreboardPreviewVisible});
            }
            else if(previewType==='stinger' && idx){
                const st=favorites.stingers[parseInt(idx,10)];
                if(overlayState.stingerPreviewVisible) updateOverlayState(eventId,{stingerPreviewVisible:false});
                else if(st) updateOverlayState(eventId,{stinger:st,stingerPreviewVisible:true,stingerVisible:false});
            }
        }
        if(liveType){
            if(liveType==='lowerThird' && id){
                if(graphicsData.liveLowerThirdId===id) updateGraphicsData(eventId,{liveLowerThirdId:null}, mode);
                else updateGraphicsData(eventId,{liveLowerThirdId:id, previewLowerThirdId:null}, mode);
            }
            else if(liveType==='titleSlide' && id){
                if(graphicsData.liveTitleSlideId===id) updateGraphicsData(eventId,{liveTitleSlideId:null}, mode);
                else updateGraphicsData(eventId,{liveTitleSlideId:id, previewTitleSlideId:null}, mode);
            }
            else if(liveType==='scoreboard'){
                const vis = overlayState.scoreboardVisible || overlayState.scoreboardPreviewVisible;
                updateOverlayState(eventId,{scoreboardVisible:!vis,scoreboardPreviewVisible:false});
            }
            else if(liveType==='stinger' && idx){
                const st=favorites.stingers[parseInt(idx,10)];
                if(overlayState.stingerVisible) updateOverlayState(eventId,{stingerVisible:false});
                else if(st) updateOverlayState(eventId,{stinger:st,stingerVisible:true,stingerPreviewVisible:false});
            }
            else if(liveType==='sponsor' && placement){ const lp={...(overlayState.sponsorPlacementsLive||{})}; lp[placement]=!lp[placement]; updateOverlayState(eventId,{sponsorPlacementsLive:lp}); }
        }
        const remType = e.target.getAttribute('data-remove');
        if(remType){
            if(remType==='lowerThird' && id){ favorites.lowerThirds=favorites.lowerThirds.filter(x=>x!==id); }
            else if(remType==='titleSlide' && id){ favorites.titleSlides=favorites.titleSlides.filter(x=>x!==id); }
            else if(remType==='scoreboard'){ favorites.scoreboard=false; }
            else if(remType==='stinger' && idx){ favorites.stingers.splice(parseInt(idx,10),1); }
            else if(remType==='sponsor' && placement){ favorites.sponsors=favorites.sponsors.filter(p=>p!==placement); }
            if(favorites.shortcuts){
                Object.keys(favorites.shortcuts).forEach(k=>{
                    const sc = favorites.shortcuts[k];
                    if(remType==='lowerThird' && sc.type==='lowerThird' && sc.id===id) delete favorites.shortcuts[k];
                    else if(remType==='titleSlide' && sc.type==='titleSlide' && sc.id===id) delete favorites.shortcuts[k];
                    else if(remType==='scoreboard' && sc.type==='scoreboard') delete favorites.shortcuts[k];
                    else if(remType==='stinger' && sc.type==='stinger' && sc.idx===parseInt(idx,10)) delete favorites.shortcuts[k];
                    else if(remType==='sponsor' && sc.type==='sponsor' && sc.placement===placement) delete favorites.shortcuts[k];
                });
            }
            updateFavorites(eventId,favorites);
        }
    });

    const hideBtn = container.querySelector('#hide-selected');
    if(hideBtn) hideBtn.addEventListener('click', ()=>{
        const checks = container.querySelectorAll('#active-list input[type="checkbox"]');
        checks.forEach((ch,i)=>{ if(ch.checked){ const itemIndex=i; const items=[]; if(overlayState.holdslateVisible) items.push({type:'holdslate'}); if(overlayState.stingerVisible) items.push({type:'stinger'}); if(overlayState.liveProgramVisible) items.push({type:'program'}); if(overlayState.scoreboardVisible||overlayState.scoreboardPreviewVisible) items.push({type:'scoreboard'}); if(overlayState.categoryRevealVisible) items.push({type:'categoryReveal'}); if(overlayState.categoryNomineesVisible) items.push({type:'categoryNominees'}); if(overlayState.runnerUpVisible) items.push({type:'runnerUp'}); if(overlayState.winnerAnnouncementVisible) items.push({type:'winnerAnnouncement'}); if(overlayState.winnerMontageVisible) items.push({type:'winnerMontage'}); const liveSponsors=overlayState.sponsorPlacementsLive||{}; Object.keys(liveSponsors).forEach(p=>{ if(liveSponsors[p]) items.push({type:'sponsor', placement:p}); }); if(graphicsData.liveLowerThirdId) items.push({type:'lowerThird'}); if(graphicsData.liveTitleSlideId) items.push({type:'titleSlide'}); if(overlayState.statVisible) items.push({type:'stat'}); const item=items[itemIndex]; if(item) hideItem(item.type,item.placement); }});
    });
    const favLiveBtn = container.querySelector('#fav-live');
    if(favLiveBtn) favLiveBtn.addEventListener('click', ()=>{
        const favChecks = container.querySelectorAll('#fav-list input[type="checkbox"]');
        const favItems = [];
        favorites.lowerThirds.forEach(id=>{ favItems.push({type:'lowerThird', id}); });
        favorites.titleSlides.forEach(id=>{ favItems.push({type:'titleSlide', id}); });
        if(favorites.scoreboard) favItems.push({type:'scoreboard', id:'scoreboard'});
        favorites.stingers.forEach(s=>{ favItems.push({type:'stinger', data:s}); });
        favorites.sponsors.forEach(p=>{ favItems.push({type:'sponsor', placement:p}); });
        favChecks.forEach((ch,i)=>{
            if(ch.checked){
                const item=favItems[i];
                if(item.type==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:item.id}, mode);
                else if(item.type==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:item.id}, mode);
                else if(item.type==='scoreboard') updateOverlayState(eventId,{scoreboardVisible:true,scoreboardPreviewVisible:false});
                else if(item.type==='stinger') updateOverlayState(eventId,{stinger:item.data,stingerVisible:true,stingerPreviewVisible:false});
                else if(item.type==='sponsor'){ const lp={...(overlayState.sponsorPlacementsLive||{})}; lp[item.placement]=true; updateOverlayState(eventId,{sponsorPlacementsLive:lp}); }
            }
        });
    });
    const logsToggle = container.querySelector('#logs-toggle');
    if(logsToggle) logsToggle.addEventListener('click', ()=>{
        logVisible = !logVisible;
        updateOverlayState(eventId,{matchLogVisible:logVisible});
        renderLog();
    });
    container.addEventListener('change', e=>{
        const pid = e.target.getAttribute('data-player');
        if(pid){
            const entry = matchLogs.find(l=>l.id===pid);
            if(entry){
                entry.player = e.target.value;
                entry.playerName = e.target.value;
                const teamPlayers = entry.team==='a'?teamsData?.teamA?.players||[]:teamsData?.teamB?.players||[];
                const pl = teamPlayers.find(p=>p.name===e.target.value);
                entry.playerNumber = pl?.number || '';
                updateMatchLogEntry(eventId,pid,entry);
            }
        }
    });

    listenOverlayState(eventId, (state) => { overlayState = state || {}; render(); });
    listenGraphicsData(eventId, (g) => {
        graphicsData = { lowerThirds: [], titleSlides: [], teams: {}, ...(g || {}) };
        render();
    }, mode);
    listenFavorites(eventId, (fav) => {
        favorites = { lowerThirds: [], titleSlides: [], scoreboard: false, stingers: [], shortcuts:{}, sponsors: [], ...(fav || {}) };
        renderFav();
    });
    listenSponsors(eventId, data => { sponsors = data || []; render(); renderFav(); });
    listenSponsorPlacements(eventId, data => { sponsorPlacements = data || {}; render(); renderFav(); });
    listenMatchLog(eventId, data => { matchLogs = data || []; renderLog(); });
    listenTeams(eventId, data => { teamsData = data; renderLog(); });
    listenOverlayState(eventId, s => { logVisible = !!(s && s.matchLogVisible); renderLog(); });

    if(favList){
        favList.addEventListener('keydown', e=>{
            if(e.target.classList.contains('fav-hotkey')){
                e.preventDefault();
                const idx = parseInt(e.target.getAttribute('data-fidx'),10);
                const key = e.key.toLowerCase();
                e.target.value = key;
                assignShortcut(idx, key);
            }
        });
        favList.addEventListener('input', e=>{
            if(e.target.classList.contains('fav-hotkey')){
                const idx = parseInt(e.target.getAttribute('data-fidx'),10);
                const key = (e.target.value || '').toLowerCase();
                assignShortcut(idx, key);
            }
        });
    }

    window.addEventListener('keydown', e=>{
        if(['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
        const key = e.key.toLowerCase();
        if(handleShortcut(key)) e.preventDefault();
    });

    const companionWsUrl = localStorage.getItem('companionWsUrl');
    if(companionWsUrl && ['localhost','127.0.0.1','::1'].includes(window.location.hostname)){
        try {
            const companionWs = new WebSocket(companionWsUrl);
            companionWs.addEventListener('message', ev => {
                let msg;
                try { msg = JSON.parse(ev.data); } catch{}
                const key = (msg && (msg.key || msg.button)) ? (msg.key || msg.button) : ev.data;
                if(typeof key === 'string') handleShortcut(String(key).toLowerCase());
            });
        } catch(err){
            console.warn('Companion WebSocket not available', err);
        }
    }

    function render() {
        const items = [];
        if (overlayState.holdslateVisible) items.push({ key:'holdslate', label:'Intro Graphic', type:'holdslate' });
        if (overlayState.fixturesVisible) items.push({ key:'fixtures', label:'Fixtures', type:'fixtures' });
        if (overlayState.formationVisible) items.push({ key:'formation', label:'Formation', type:'formation' });
        if (overlayState.courseVisible) items.push({ key:'course', label:'Course Details', type:'course' });
        if (overlayState.stingerVisible) items.push({ key:'stinger', label:'Stinger', type:'stinger' });
        if (overlayState.liveProgramVisible) items.push({ key:'program', label:'Program', type:'program' });
        if (overlayState.statVisible) items.push({ key:'stat', label:'Stat', type:'stat' });
        if (overlayState.scoreboardVisible || overlayState.scoreboardPreviewVisible) items.push({ key:'scoreboard', label:'Scoreboard', type:'scoreboard' });
        if (overlayState.categoryRevealVisible || overlayState.categoryRevealPreviewVisible) items.push({ key:'category', label:'Category', type:'categoryReveal' });
        if (overlayState.categoryNomineesVisible || overlayState.categoryNomineesPreviewVisible) items.push({ key:'category-nominees', label:'Nominees', type:'categoryNominees' });
        if (overlayState.runnerUpVisible || overlayState.runnerUpPreviewVisible) items.push({ key:'runner-up', label:'Runner Up', type:'runnerUp' });
        if (overlayState.winnerAnnouncementVisible || overlayState.winnerAnnouncementPreviewVisible) items.push({ key:'winner', label:'Winner', type:'winnerAnnouncement' });
        if (overlayState.winnerMontageVisible || overlayState.winnerMontagePreviewVisible) items.push({ key:'winner-montage', label:'Winner Montage', type:'winnerMontage' });
        const liveSponsors = overlayState.sponsorPlacementsLive || {};
        Object.keys(liveSponsors).forEach(p=>{
            if(liveSponsors[p]){
                const idx = sponsorPlacements[p];
                const sp = sponsors[idx];
                const label = `Sponsor: ${sp ? sp.name : (sponsorPlacementLabels[p]||p)}`;
                items.push({ key:`sponsor-${p}`, label, type:'sponsor', placement:p });
            }
        });
        if (graphicsData.liveLowerThirdId && graphicsData.lowerThirds) {
            const lt = graphicsData.lowerThirds.find(l=>l.id===graphicsData.liveLowerThirdId);
            if (lt) items.push({ key:'lt', label:`Lower Third: ${lt.title}`, type:'lowerThird' });
        }
        if (graphicsData.liveTitleSlideId && graphicsData.titleSlides) {
            const ts = graphicsData.titleSlides.find(t=>t.id===graphicsData.liveTitleSlideId);
            if (ts) items.push({ key:'ts', label:`Title Slide: ${ts.title}`, type:'titleSlide' });
        }
        if (activeList) {
            const listHtml = items.map((it,i)=>{
                const hideAttr = it.type==='sponsor' ? `data-hide="sponsor" data-placement="${it.placement}"` : `data-hide="${it.type}"`;
                return `<li class="flex items-center gap-2"><input type="checkbox" data-idx="${i}"><span class="flex-1">${it.label}</span><button class="control-button btn-xs" ${hideAttr}>Hide</button></li>`;
            }).join('');
            activeList.innerHTML = listHtml || '<li class="text-gray-500">No active graphics.</li>';
        }
    }

    function hideItem(type, placement){
        if(type==='holdslate') updateOverlayState(eventId,{holdslateVisible:false,holdslatePreviewVisible:false});
        else if(type==='program') updateOverlayState(eventId,{liveProgramVisible:false,previewProgramVisible:false});
        else if(type==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:null}, mode);
        else if(type==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:null}, mode);
        else if(type==='stat') updateOverlayState(eventId,{statVisible:false,statPreviewVisible:false});
        else if(type==='stinger') updateOverlayState(eventId,{stingerVisible:false,stingerPreviewVisible:false});
        else if(type==='scoreboard') updateOverlayState(eventId,{scoreboardVisible:false,scoreboardPreviewVisible:false});
        else if(type==='fixtures') updateOverlayState(eventId,{fixturesVisible:false,fixturesPreviewVisible:false});
        else if(type==='formation') updateOverlayState(eventId,{formationVisible:false,formationPreviewVisible:false});
        else if(type==='course') updateOverlayState(eventId,{courseVisible:false,coursePreviewVisible:false});
        else if(type==='categoryReveal') updateOverlayState(eventId,{categoryRevealVisible:false,categoryRevealPreviewVisible:false});
        else if(type==='categoryNominees') updateOverlayState(eventId,{categoryNomineesVisible:false,categoryNomineesPreviewVisible:false});
        else if(type==='runnerUp') updateOverlayState(eventId,{runnerUpVisible:false,runnerUpPreviewVisible:false});
        else if(type==='winnerAnnouncement') updateOverlayState(eventId,{winnerAnnouncementVisible:false,winnerAnnouncementPreviewVisible:false});
        else if(type==='winnerMontage') updateOverlayState(eventId,{winnerMontageVisible:false,winnerMontagePreviewVisible:false});
        else if(type==='sponsor' && placement){
            const lp = { ...(overlayState.sponsorPlacementsLive||{}) };
            lp[placement] = false;
            updateOverlayState(eventId,{sponsorPlacementsLive:lp});
        }
    }

    function renderFav() {
        const lts = graphicsData.lowerThirds || [];
        const ts = graphicsData.titleSlides || [];
        const favItems = [];
        favorites.lowerThirds.forEach(id=>{ const lt=lts.find(l=>l.id===id); if(lt) favItems.push({id, label:`LT: ${lt.title}`,type:'lowerThird'}); });
        favorites.titleSlides.forEach(id=>{ const t=ts.find(t=>t.id===id); if(t) favItems.push({id, label:`TS: ${t.title}`, type:'titleSlide'}); });
        if(favorites.scoreboard) favItems.push({id:'scoreboard', label:'Scoreboard', type:'scoreboard'});
        favorites.stingers.forEach((s,i)=>{ favItems.push({idx:i, label:`Stinger: ${s.label||'Custom'}`, type:'stinger', data:s}); });
        favorites.sponsors.forEach(p=>{ const idx=sponsorPlacements[p]; const sp=sponsors[idx]; const label=`Sponsor: ${sp?sp.name:(sponsorPlacementLabels[p]||p)}`; favItems.push({placement:p, label, type:'sponsor'}); });
        const shortcuts = favorites.shortcuts || {};
        favItems.forEach(it=>{
            const key = Object.keys(shortcuts).find(k=>{
                const sc = shortcuts[k];
                return sc && sc.type===it.type && sc.id===it.id && sc.idx===it.idx && sc.placement===it.placement;
            });
            it.key = key;
        });
        favRenderItems = favItems;
        if (favList) {
            const favHtml = favItems.map((f,i)=>{
                const liveAttr = f.type==='stinger' ? `data-live="stinger" data-idx="${f.idx}"` : f.type==='sponsor' ? `data-live="sponsor" data-placement="${f.placement}"` : `data-live="${f.type}" data-id="${f.id}"`;
                const remAttr = f.type==='stinger' ? `data-remove="stinger" data-idx="${f.idx}"` : f.type==='sponsor' ? `data-remove="sponsor" data-placement="${f.placement}"` : `data-remove="${f.type}" data-id="${f.id}"`;
                const prevAttr = f.type==='stinger' ? `data-preview="stinger" data-idx="${f.idx}"` : f.type==='sponsor' ? '' : f.type==='scoreboard' ? `data-preview="scoreboard"` : `data-preview="${f.type}" data-id="${f.id}"`;
                const previewBtn = prevAttr ? `<button class="control-button btn-xs btn-preview" ${prevAttr}>Preview</button>` : '';
                return `<li class="flex items-center gap-2"><input type="checkbox" data-fidx="${i}"><span class="flex-1">${f.label}</span><input type="text" class="w-8 text-center border fav-hotkey" data-fidx="${i}" maxlength="1" value="${f.key||''}">${previewBtn}<button class="control-button btn-xs btn-live" ${liveAttr}>Live</button><button class="control-button btn-xs btn-remove" ${remAttr}>Remove</button></li>`;
            }).join('');
            favList.innerHTML = favHtml || '<li class="text-gray-500">No favourites.</li>';
        }
    }

    function renderLog(){
        if(!logsTable) return;
        const rows = (matchLogs||[]).map(e=>{
            const team = e.team==='a'?teamsData?.teamA?.name||'Team A':teamsData?.teamB?.name||'Team B';
            const players = e.team==='a'?teamsData?.teamA?.players||[]:teamsData?.teamB?.players||[];
            const selectedName = e.playerName || e.player || '';
            const opts = ['<option value="">-</option>', ...players.map(p=>`<option ${selectedName===p.name?'selected':''} value="${p.name}">${p.number?`#${p.number} `:''}${p.name}</option>`)].join('');
            return `<tr data-id="${e.id}"><td class='pr-2'>${e.time}</td><td>${team}</td><td>${e.type}</td><td><select data-player="${e.id}" class='border p-1'>${opts}</select></td></tr>`;
        }).join('');
        logsTable.innerHTML = `<thead><tr><th class='pr-2'>Time</th><th>Team</th><th>Type</th><th>Player</th></tr></thead><tbody>${rows}</tbody>`;
        const btn = container.querySelector('#logs-toggle');
        if(btn) btn.textContent = logVisible ? 'Hide Overlay' : 'Show Overlay';
    }
}
