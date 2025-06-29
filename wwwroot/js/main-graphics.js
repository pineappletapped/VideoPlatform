import { eventStorage } from './storage.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderProgramPreview } from './components/programPreview.js';
import { renderGraphicsPanel } from './components/graphicsPanel.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderLineupPanel } from './components/lineupPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderSportPanel } from './components/sportPanel.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { renderProfileWizard } from './components/profileWizard.js';
import { renderCalendarDrawer } from './components/calendarDrawer.js';
import { renderHoldslatePanel } from './components/holdslatePanel.js';
import { updateOverlayState, getOverlayState, getEventMetadata, updateEventMetadata, getGraphicsData, updateGraphicsData } from './firebase.js';
import { renderVtsPanel } from './components/vtsPanel.js';
import { renderMusicPanel } from './components/musicPanel.js';
import { renderActiveGraphicsPanel } from './components/activeGraphicsPanel.js';
import { renderBrandingPanel } from './components/brandingPanel.js';
import { requireAuth, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let currentUserId = '';

let loadedVT = null;
let graphicsMode = 'live';

async function initializeApp(user) {
    currentUserId = user ? user.uid.replace('local-','') : '';
    let firebaseStatus = 'Connecting to Firebase...';
    try {
        await getOverlayState(eventId);
        firebaseStatus = 'Connected to Firebase';
    } catch (e) {
        firebaseStatus = 'Firebase connection failed';
    }
    try {
        const eventData = await eventStorage.loadEvent(eventId);
        let eventMeta = await getEventMetadata(eventId);
        if (eventMeta) Object.assign(eventData, eventMeta);
        eventData.firebaseStatus = firebaseStatus;
        initializeComponents(eventData);
    } catch (error) {
        document.body.innerHTML = '<div class="text-red-600 p-8">Failed to load event data.</div>';
        console.error('Failed to initialize app:', error);
    }
}

function setupTabs() {
    function setActiveTab(tabName, containerClass) {
        const container = document.querySelector(containerClass);
        if (!container) return;
        const buttons = container.querySelectorAll('[data-tab]');
        const contents = Array.from(container.querySelectorAll('.tab-content'));
        buttons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('border-b-2','border-brand','text-brand','font-semibold');
            } else {
                button.classList.remove('border-b-2','border-brand','text-brand','font-semibold');
            }
        });
        contents.forEach(content => {
            if (content.id && content.id.includes(tabName)) {
                content.classList.remove('hidden');
            } else {
                content.classList.add('hidden');
            }
        });
    }
    document.querySelectorAll('.graphics-panel [data-tab]').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab'), '.graphics-panel'));
    });
    document.querySelectorAll('.av-panel [data-tab]').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab'), '.av-panel'));
    });
    setActiveTab('holdslate','.graphics-panel');
    setActiveTab('vts','.av-panel');
}

function updateGraphicsTabs(type) {
    const tabBar = document.getElementById('graphics-tabs');
    if (!tabBar) return;
    const sports = ['scoreboard','lineups','stats','teams','sport'];
    sports.forEach(t=>{
        const btn = tabBar.querySelector(`[data-tab="${t}"]`);
        const panel = document.getElementById(`${t}-panel`);
        if (btn && panel) {
            if (type === 'sports') { btn.classList.remove('hidden'); panel.classList.add('hidden'); }
            else { btn.classList.add('hidden'); panel.classList.add('hidden'); }
        }
    });
    const scheduleBtn = tabBar.querySelector('[data-tab="schedule"]');
    const schedulePanel = document.getElementById('schedule-panel');
    const brandingBtn = tabBar.querySelector('[data-tab="branding"]');
    const brandingPanel = document.getElementById('branding-panel');
    if (scheduleBtn && schedulePanel) {
        if (type === 'sports') {
            scheduleBtn.classList.add('hidden');
            schedulePanel.classList.add('hidden');
        } else {
            scheduleBtn.classList.remove('hidden');
            schedulePanel.classList.remove('hidden');
        }
    }
    if (brandingBtn && brandingPanel) {
        if (type === 'sports') {
            brandingBtn.classList.add('hidden');
            brandingPanel.classList.add('hidden');
        } else {
            brandingBtn.classList.remove('hidden');
            brandingPanel.classList.remove('hidden');
        }
    }
}

async function initializeComponents(eventData) {
    setupTabs();
    const preview = document.getElementById('video-preview');
    const program = document.getElementById('video-program');
    function loadIframe(target, previewMode){
        const iframe = document.createElement('iframe');
        const mode = previewMode ? '&mode=preview' : '';
        iframe.src = `overlay.html?event_id=${eventId}${mode}`;
        iframe.style.width = '1920px';
        iframe.style.height = '1080px';
        iframe.className = 'rounded pointer-events-none';
        iframe.style.position = 'absolute';
        iframe.style.top = '0';
        iframe.style.left = '0';
        target.innerHTML = '';
        target.style.position = 'relative';
        target.appendChild(iframe);
        const updateScale = () => {
            const scale = Math.min(target.clientWidth / 1920, target.clientHeight / 1080);
            const offsetX = (target.clientWidth - 1920 * scale) / 2;
            const offsetY = (target.clientHeight - 1080 * scale) / 2;
            iframe.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
            iframe.style.transformOrigin = 'top left';
        };
        requestAnimationFrame(updateScale);
        new ResizeObserver(updateScale).observe(target);
    }
    if (preview) loadIframe(preview, true);
    if (program) loadIframe(program, false);
    const cutBtn = document.getElementById('cut-button');
    if (cutBtn) cutBtn.onclick = () => { cutToProgram(); };
    const topBar = document.createElement('top-bar');
    topBar.setAttribute('event-type', eventData.eventType || 'corporate');
    if (currentUserId === 'ryanadmin') topBar.setAttribute('is-admin','true');
    topBar.addEventListener('logout', logout);
    topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
    topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ userId: currentUserId }); modal.classList.remove('hidden'); });
    topBar.addEventListener('event-type-change', async e => {
        const newType = e.detail;
        await updateEventMetadata(eventId,{...eventData,eventType:newType});
        eventData.eventType = newType;
        renderGraphicsPanel(document.getElementById('lower-thirds-panel'), {...eventData}, graphicsMode);
        updateGraphicsTabs(newType);
        if (newType === 'sports') {
            renderSportPanel(document.getElementById('sport-panel'), eventData, async (id,sport)=>{
                await updateEventMetadata(eventId,{...eventData,sport});
                eventData.sport = sport;
                renderScoreboardPanel(document.getElementById('scoreboard-panel'), sport, eventId);
            });
            renderScoreboardPanel(document.getElementById('scoreboard-panel'), eventData.sport, eventId);
            renderLineupPanel(document.getElementById('lineups-panel'));
            renderStatsPanel(document.getElementById('stats-panel'));
        renderTeamsPanel(document.getElementById('teams-panel'), eventId, sport);
        } else {
            renderProgramPreview(document.getElementById('schedule-panel'), eventData, onOverlayStateChange);
        }
    });
    document.getElementById('top-bar').appendChild(topBar);
    renderStatusBar(document.getElementById('status-bar'), eventData, {listener:false, atem:false, obs:false, sport:true, clock:true});
    updateGraphicsTabs(eventData.eventType || 'corporate');
    if ((eventData.eventType || 'corporate') === 'sports') {
        renderSportPanel(document.getElementById('sport-panel'), eventData, async (id,sport)=>{
            await updateEventMetadata(eventId,{...eventData,sport});
            eventData.sport = sport;
            renderScoreboardPanel(document.getElementById('scoreboard-panel'), sport, eventId);
        });
        renderScoreboardPanel(document.getElementById('scoreboard-panel'), eventData.sport, eventId);
        renderLineupPanel(document.getElementById('lineups-panel'));
        renderStatsPanel(document.getElementById('stats-panel'));
        renderTeamsPanel(document.getElementById('teams-panel'), eventId, eventData.sport);
    } else {
        renderProgramPreview(document.getElementById('schedule-panel'), eventData, onOverlayStateChange);
    }

    renderHoldslatePanel(document.getElementById('holdslate-panel'), onOverlayStateChange);
    renderGraphicsPanel(document.getElementById('lower-thirds-panel'), eventData, graphicsMode);

    renderVtsPanel(document.getElementById('vts-panel'), eventId, vt => { loadedVT = vt; window.loadedVT = vt; });
    renderMusicPanel(document.getElementById('music-panel'), eventId);
    renderActiveGraphicsPanel(document.getElementById('active-graphics'), eventId, graphicsMode);
    renderBrandingPanel(document.getElementById('branding-panel'), eventId);

    setupAudioControls();


    const brandingModal = document.getElementById('branding-modal');
    renderBrandingModal(brandingModal, { eventId });
    brandingModal.classList.add('hidden');
    if (params.get('setup') === '1') {
        renderProfileWizard(document.getElementById('profile-wizard'), eventData);
    }
    renderCalendarDrawer(document.getElementById('calendar-drawer'), eventData);

    const brandingBtn = document.getElementById('footer-branding');
    if (brandingBtn) brandingBtn.onclick = ()=>{ renderBrandingModal(brandingModal,{ eventId }); brandingModal.classList.remove('hidden'); };
}

function onOverlayStateChange(state) {
    updateOverlayState(eventId, state);
}

let masterVolume=1, vtVolume=1, musicVolume=1;
window.masterVolume=masterVolume; window.vtVolume=vtVolume; window.musicVolume=musicVolume;

function setupAudioControls() {
    const master=document.getElementById('audio-master');
    const vt=document.getElementById('audio-vt');
    const music=document.getElementById('audio-music');
    const update=()=>{
        updateOverlayState(eventId,{masterVolume,vtVolume,musicVolume});
        window.masterVolume=masterVolume; window.vtVolume=vtVolume; window.musicVolume=musicVolume;
        if(window.musicPlayer&&window.musicPlayer.setVolume){ window.musicPlayer.setVolume(masterVolume*musicVolume); }
        if(window.vtPlayer&&window.vtPlayer.setVolume){ window.vtPlayer.setVolume(masterVolume*vtVolume); }
    };
    if(master){ master.value=masterVolume; master.oninput=()=>{ masterVolume=parseFloat(master.value); update(); }; }
    if(vt){ vt.value=vtVolume; vt.oninput=()=>{ vtVolume=parseFloat(vt.value); update(); }; }
    if(music){ music.value=musicVolume; music.oninput=()=>{ musicVolume=parseFloat(music.value); update(); }; }
    update();
}

async function cutToProgram() {
    const [state, graphics] = await Promise.all([
        getOverlayState(eventId),
        getGraphicsData(eventId, graphicsMode)
    ]);
    const overlayUpdates = {};
    const graphicsUpdates = {};
    if (state) {
        if (state.holdslatePreviewVisible) {
            overlayUpdates.holdslateVisible = true;
            overlayUpdates.holdslatePreviewVisible = false;
        }
        if (state.previewProgramVisible) {
            overlayUpdates.liveProgramVisible = true;
            overlayUpdates.previewProgramVisible = false;
        }
    }
    if (graphics) {
        if (graphics.previewLowerThirdId) {
            graphicsUpdates.liveLowerThirdId = graphics.previewLowerThirdId;
            graphicsUpdates.previewLowerThirdId = null;
        }
        if (graphics.previewTitleSlideId) {
            graphicsUpdates.liveTitleSlideId = graphics.previewTitleSlideId;
            graphicsUpdates.previewTitleSlideId = null;
        }
    }
    if (Object.keys(graphicsUpdates).length) {
        await updateGraphicsData(eventId, graphicsUpdates, graphicsMode);
    }
    if (Object.keys(overlayUpdates).length) {
        await updateOverlayState(eventId, overlayUpdates);
    }
}

requireAuth(`graphics.html?event_id=${eventId}`).then(u => initializeApp(u));
