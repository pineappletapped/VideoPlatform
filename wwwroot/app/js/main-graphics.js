import { eventStorage } from './storage.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderProgramPreview } from './components/programPreview.js';
import { renderGraphicsPanel } from './components/graphicsPanel.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderSpeakersPanel } from './components/speakersPanel.js';
import { getTeamLabel } from './sportsConfig.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { renderProfileWizard } from './components/profileWizard.js';
import { renderCalendarDrawer } from './components/calendarDrawer.js';
import { renderIntroPanel } from './components/introPanel.js';
import { updateOverlayState, getOverlayState, getEventMetadata, updateEventMetadata, getGraphicsData, updateGraphicsData, getUserFeatures, listenGraphicsNotify, clearGraphicsNotify } from './firebase.js';
import { renderActiveGraphicsPanel } from './components/activeGraphicsPanel.js';
import { renderBrandingPanel } from './components/brandingPanel.js';
import { requireAuth, logout } from './auth.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let currentUserId = '';

let graphicsMode = 'live';
let userFeatures = {};
let eventsNotify = false;

function highlightLatestLowerThird() {
    const rows = document.querySelectorAll('#events-panel tbody tr');
    if (rows.length) {
        const last = rows[rows.length - 1];
        last.classList.add('bg-yellow-100', 'animate-pulse');
        setTimeout(() => {
            last.classList.remove('bg-yellow-100', 'animate-pulse');
        }, 2000);
    }
}

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
        const eventMeta = await getEventMetadata(eventId);
        if (eventMeta) Object.assign(eventData, eventMeta);
        userFeatures = await getUserFeatures(eventMeta?.owner || user?.uid || '');
        updateEventMetadata(eventId, { lastOpened: Date.now() }).catch(()=>{});
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
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            setActiveTab(tab, '.graphics-panel');
            if(tab === 'events'){
                const evBtn = document.querySelector('#graphics-tabs [data-tab="events"]');
                evBtn?.classList.remove('animate-pulse','bg-brand','text-white');
                if(eventsNotify) highlightLatestLowerThird();
                clearGraphicsNotify(eventId, 'events');
                eventsNotify = false;
            }
        });
    });
    document.querySelectorAll('.av-panel [data-tab]').forEach(btn => {
        btn.addEventListener('click', () => setActiveTab(btn.getAttribute('data-tab'), '.av-panel'));
    });
    setActiveTab('intro','.graphics-panel');
    setActiveTab('vts','.av-panel');
}

function updateGraphicsTabs(type, tournament, corporateType = 'conference') {
    const tabBar = document.getElementById('graphics-tabs');
    if (!tabBar) return;
    const sports = ['scoreboard','stats','teams'];
    if (tournament) sports.push('tournament');
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
    const presBtn = tabBar.querySelector('[data-tab="presentation"]');
    const presPanel = document.getElementById('presentation-panel');
    const spkBtn = tabBar.querySelector('[data-tab="speakers"]');
    const spkPanel = document.getElementById('speakers-panel');
    const showSchedule = type !== 'sports' && corporateType !== 'podcast';
    const showPres = type !== 'sports' && corporateType === 'conference';
    const showSpeakers = type !== 'sports';
    if (scheduleBtn && schedulePanel) {
        if (showSchedule) {
            scheduleBtn.classList.remove('hidden');
            schedulePanel.classList.remove('hidden');
        } else {
            scheduleBtn.classList.add('hidden');
            schedulePanel.classList.add('hidden');
        }
    }
    if(presBtn && presPanel){
        if(showPres){
            presBtn.classList.remove('hidden');
            presPanel.classList.add('hidden');
        }else{
            presBtn.classList.add('hidden');
            presPanel.classList.add('hidden');
        }
    }
    if(spkBtn && spkPanel){
        if(showSpeakers){
            spkBtn.classList.remove('hidden');
            spkPanel.classList.add('hidden');
        } else {
            spkBtn.classList.add('hidden');
            spkPanel.classList.add('hidden');
        }
    }
    const eventsLabel = document.getElementById('events-tab-label');
    if(eventsLabel){
        eventsLabel.textContent = type === 'sports' ? 'In Game Events' : 'Lower Thirds';
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
    if (currentUserId === 'ryanadmin') topBar.setAttribute('is-admin','true');
    topBar.setAttribute('event-name', eventData.title || eventId);
    topBar.addEventListener('logout', logout);
    topBar.addEventListener('edit-account', () => { window.location.href = 'account.html'; });
    topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ userId: currentUserId }); modal.classList.remove('hidden'); });

    document.getElementById('top-bar').appendChild(topBar);
    renderStatusBar(document.getElementById('status-bar'), eventData, {listener:false, atem:false, obs:false, sport:true, clock:true});
    const corpType = eventData.corporateType || 'conference';
    updateGraphicsTabs(eventData.eventType || 'corporate', !!(eventData.tournament && userFeatures.tournament), corpType);
    if ((eventData.eventType || 'corporate') === 'sports') {
        const teamLabel = getTeamLabel(eventData.sport);
        const teamsTabBtn = document.querySelector('[data-tab="teams"]');
        if(teamsTabBtn) teamsTabBtn.textContent = teamLabel;
        renderScoreboardPanel(document.getElementById('scoreboard-panel'), eventData.sport, eventId);
        renderStatsPanel(document.getElementById('stats-panel'), eventId);
        const enableTournament = !!(eventData.tournament && userFeatures.tournament);
        renderTeamsPanel(document.getElementById('teams-panel'), eventId, eventData.sport, enableTournament);
        if(enableTournament){
            const tnPanel = document.getElementById('tournament-panel');
            if(tnPanel){
                const { renderTournamentPanel } = await import('./components/tournamentPanel.js');
                renderTournamentPanel(tnPanel, eventId, eventData.sport);
            }
        } else {
            document.querySelector('[data-tab="tournament"]')?.classList.add('hidden');
            document.getElementById('tournament-panel')?.classList.add('hidden');
        }
    } else {
        renderSpeakersPanel(document.getElementById('speakers-panel'), eventId);
        if(corpType !== 'podcast'){
            renderProgramPreview(document.getElementById('schedule-panel'), eventData, onOverlayStateChange);
        }
    }

    renderIntroPanel(document.getElementById('intro-panel'), eventId, onOverlayStateChange);
    const { renderStingerPanel } = await import('./components/stingerPanel.js');
    renderStingerPanel(document.getElementById('stinger-panel'), eventId);
    if((eventData.eventType || 'corporate') === 'corporate' && corpType === 'conference') {
        const { renderPresentationPanel } = await import('./components/presentationPanel.js');
        renderPresentationPanel(document.getElementById('presentation-panel'), eventId);
    }
    renderGraphicsPanel(document.getElementById('events-panel'), eventData, graphicsMode);

    listenGraphicsNotify(eventId, data => {
        if(data.events){
            const btn = document.querySelector('#graphics-tabs [data-tab="events"]');
            if(btn){
                btn.classList.add('animate-pulse','bg-brand','text-white');
                eventsNotify = true;
            }
        }
    });

    renderActiveGraphicsPanel(document.getElementById('active-graphics'), eventId, graphicsMode);
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
