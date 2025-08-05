import { listenOverlayState, updateOverlayState, listenGraphicsData, updateGraphicsData, listenMatchLog, updateMatchLogEntry } from '../firebase.js';
import { listenFavorites, updateFavorites } from '../firebase.js';
import { renderSponsorsPanel } from './sponsorsPanel.js';
import { getDatabaseInstance } from '../firebaseApp.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js';

export function renderActiveGraphicsPanel(container, eventId, mode = 'live', canRotate = false) {
    let overlayState = {};
    let graphicsData = {};
    let favorites = { lowerThirds: [], titleSlides: [], scoreboard: false };
    let matchLogs = [];
    let teamsData = null;
    let logVisible = false;

    // Build initial markup before registering listeners so callbacks
    // have elements to target.
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
        renderSponsorsPanel(sponsorsContainer, eventId, canRotate);
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
        if(hideType){ hideItem(hideType); }
        const liveType = e.target.getAttribute('data-live');
        const id = e.target.getAttribute('data-id');
        if(liveType && id){
            if(liveType==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:id}, mode);
            else if(liveType==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:id}, mode);
        }
        const remType = e.target.getAttribute('data-remove');
        if(remType && id){
            if(remType==='lowerThird'){ favorites.lowerThirds=favorites.lowerThirds.filter(x=>x!==id); }
            else if(remType==='titleSlide'){ favorites.titleSlides=favorites.titleSlides.filter(x=>x!==id); }
            else if(remType==='scoreboard'){ favorites.scoreboard=false; }
            updateFavorites(eventId,favorites);
        }
    });

    const hideBtn = container.querySelector('#hide-selected');
    if(hideBtn) hideBtn.addEventListener('click', ()=>{
        const checks = container.querySelectorAll('#active-list input[type="checkbox"]');
        checks.forEach((ch,i)=>{ if(ch.checked){ const itemIndex=i; const items=[]; if(overlayState.holdslateVisible) items.push({type:'holdslate'}); if(overlayState.stingerVisible) items.push({type:'stinger'}); if(overlayState.liveProgramVisible) items.push({type:'program'}); if(overlayState.scoreboardVisible||overlayState.scoreboardPreviewVisible) items.push({type:'scoreboard'}); if(graphicsData.liveLowerThirdId) items.push({type:'lowerThird'}); if(graphicsData.liveTitleSlideId) items.push({type:'titleSlide'}); if(overlayState.statVisible) items.push({type:'stat'}); const item=items[itemIndex]; if(item) hideItem(item.type); }});
    });
    const favLiveBtn = container.querySelector('#fav-live');
    if(favLiveBtn) favLiveBtn.addEventListener('click', ()=>{
        const favChecks = container.querySelectorAll('#fav-list input[type="checkbox"]');
        const favItems = [];
        favorites.lowerThirds.forEach(id=>{ favItems.push({type:'lowerThird', id}); });
        favorites.titleSlides.forEach(id=>{ favItems.push({type:'titleSlide', id}); });
        if(favorites.scoreboard) favItems.push({type:'scoreboard', id:'scoreboard'});
        favChecks.forEach((ch,i)=>{ if(ch.checked){ const item=favItems[i]; if(item.type==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:item.id}, mode); else if(item.type==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:item.id}, mode); else if(item.type==='scoreboard') updateOverlayState(eventId,{scoreboardVisible:true,scoreboardPreviewVisible:false}); }});
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
        favorites = { lowerThirds: [], titleSlides: [], scoreboard: false, ...(fav || {}) };
        renderFav();
    });
    listenMatchLog(eventId, data => { matchLogs = data || []; renderLog(); });
    onValue(ref(getDatabaseInstance(), `teams/${eventId}`), snap => { teamsData = snap.val(); renderLog(); });
    listenOverlayState(eventId, s => { logVisible = !!(s && s.matchLogVisible); renderLog(); });

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
        if (graphicsData.liveLowerThirdId && graphicsData.lowerThirds) {
            const lt = graphicsData.lowerThirds.find(l=>l.id===graphicsData.liveLowerThirdId);
            if (lt) items.push({ key:'lt', label:`Lower Third: ${lt.title}`, type:'lowerThird' });
        }
        if (graphicsData.liveTitleSlideId && graphicsData.titleSlides) {
            const ts = graphicsData.titleSlides.find(t=>t.id===graphicsData.liveTitleSlideId);
            if (ts) items.push({ key:'ts', label:`Title Slide: ${ts.title}`, type:'titleSlide' });
        }
        if (activeList) {
            const listHtml = items.map((it,i)=>`<li class="flex items-center gap-2"><input type="checkbox" data-idx="${i}"><span class="flex-1">${it.label}</span><button class="control-button btn-xs" data-hide="${it.type}">Hide</button></li>`).join('');
            activeList.innerHTML = listHtml || '<li class="text-gray-500">No active graphics.</li>';
        }
    }

    function hideItem(type){
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
    }

    function renderFav() {
        const lts = graphicsData.lowerThirds || [];
        const ts = graphicsData.titleSlides || [];
        const favItems = [];
        favorites.lowerThirds.forEach(id=>{ const lt=lts.find(l=>l.id===id); if(lt) favItems.push({id, label:`LT: ${lt.title}`, type:'lowerThird'}); });
        favorites.titleSlides.forEach(id=>{ const t=ts.find(t=>t.id===id); if(t) favItems.push({id, label:`TS: ${t.title}`, type:'titleSlide'}); });
        if(favorites.scoreboard) favItems.push({id:'scoreboard', label:'Scoreboard', type:'scoreboard'});
        if (favList) {
            const favHtml = favItems.map((f,i)=>`<li class="flex items-center gap-2"><input type="checkbox" data-fidx="${i}"><span class="flex-1">${f.label}</span><button class="control-button btn-xs" data-live="${f.type}" data-id="${f.id}">Live</button><button class="control-button btn-xs btn-remove" data-remove="${f.type}" data-id="${f.id}">Remove</button></li>`).join('');
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
        if(hideType){ hideItem(hideType); }
        const liveType = e.target.getAttribute('data-live');
        const id = e.target.getAttribute('data-id');
        if(liveType && id){
            if(liveType==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:id}, mode);
            else if(liveType==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:id}, mode);
        }
        const remType = e.target.getAttribute('data-remove');
        if(remType && id){
            if(remType==='lowerThird'){ favorites.lowerThirds=favorites.lowerThirds.filter(x=>x!==id); }
            else if(remType==='titleSlide'){ favorites.titleSlides=favorites.titleSlides.filter(x=>x!==id); }
            else if(remType==='scoreboard'){ favorites.scoreboard=false; }
            updateFavorites(eventId,favorites);
        }
    });

    container.querySelector('#hide-selected').addEventListener('click', ()=>{
        const checks = container.querySelectorAll('#active-list input[type="checkbox"]');
        checks.forEach((ch,i)=>{ if(ch.checked){ const itemIndex=i; const items=[]; if(overlayState.holdslateVisible) items.push({type:'holdslate'}); if(overlayState.stingerVisible) items.push({type:'stinger'}); if(overlayState.liveProgramVisible) items.push({type:'program'}); if(overlayState.scoreboardVisible||overlayState.scoreboardPreviewVisible) items.push({type:'scoreboard'}); if(graphicsData.liveLowerThirdId) items.push({type:'lowerThird'}); if(graphicsData.liveTitleSlideId) items.push({type:'titleSlide'}); if(overlayState.statVisible) items.push({type:'stat'}); const item=items[itemIndex]; if(item) hideItem(item.type); }});
    });
    container.querySelector('#fav-live').addEventListener('click', ()=>{
        const favChecks = container.querySelectorAll('#fav-list input[type="checkbox"]');
        const favItems = [];
        favorites.lowerThirds.forEach(id=>{ favItems.push({type:'lowerThird', id}); });
        favorites.titleSlides.forEach(id=>{ favItems.push({type:'titleSlide', id}); });
        if(favorites.scoreboard) favItems.push({type:'scoreboard', id:'scoreboard'});
        favChecks.forEach((ch,i)=>{ if(ch.checked){ const item=favItems[i]; if(item.type==='lowerThird') updateGraphicsData(eventId,{liveLowerThirdId:item.id}, mode); else if(item.type==='titleSlide') updateGraphicsData(eventId,{liveTitleSlideId:item.id}, mode); else if(item.type==='scoreboard') updateOverlayState(eventId,{scoreboardVisible:true,scoreboardPreviewVisible:false}); }});
    });

    container.querySelector('#logs-toggle').addEventListener('click', ()=>{
        logVisible = !logVisible;
        updateOverlayState(eventId,{matchLogVisible:logVisible});
        renderLog();
    });
    container.addEventListener('change', e=>{
        const pid = e.target.getAttribute('data-player');
        if(pid){
            const entry = matchLogs.find(l=>l.id===pid);
            if(entry){ entry.player = e.target.value; updateMatchLogEntry(eventId,pid,entry); }
        }
    });
}
