import { eventStorage } from './storage.js';
import './components/topBar.js';
import { renderStatusBar } from './components/statusBar.js';
import { renderProgramPreview } from './components/programPreview.js';
import { renderInputSourcesBar } from './components/inputSourcesBar.js';
import { renderGraphicsPanel } from './components/graphicsPanel.js';
import { renderScoreboardPanel } from './components/scoreboardPanel.js';
import { renderLineupPanel } from './components/lineupPanel.js';
import { renderStatsPanel } from './components/statsPanel.js';
import { renderTeamsPanel } from './components/teamsPanel.js';
import { renderSportPanel } from './components/sportPanel.js';
import { renderObsControls } from './components/obsControls.js';
import { renderAtemControls } from './components/atemControls.js';
import { renderPtzControls } from './components/ptzControls.js';
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

// Get event ID from URL params
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let currentUserId = '';

let loadedVT = null;
let graphicsMode = 'live';

async function initializeApp(user) {
    let firebaseStatus = 'Connecting to Firebase...';
    currentUserId = user ? user.uid.replace('local-','') : '';
    try {
        // Test Firebase connection
        await getOverlayState(eventId);
        firebaseStatus = 'Connected to Firebase';
    } catch (e) {
        firebaseStatus = 'Firebase connection failed';
    }
    try {
        // Load event data (from JSON)
        const eventData = await eventStorage.loadEvent(eventId);
        // Load event metadata (from Firebase)
        let eventMeta = await getEventMetadata(eventId);
        if (eventMeta) {
            Object.assign(eventData, eventMeta);
        }
        eventData.firebaseStatus = firebaseStatus;
        console.log('Event loaded:', eventData);

        // Initialize UI components
        initializeComponents(eventData);
    } catch (error) {
        document.body.innerHTML = '<div class="text-red-600 p-8">Failed to load event data.</div>';
        console.error('Failed to initialize app:', error);
    }
}

function setupTabs() {
    // Helper to set active tab within a specific container
    function setActiveTab(tabName, containerClass) {
        const container = document.querySelector(containerClass);
        if (!container) return;
        // Always re-query for tab buttons and contents to avoid caching
        const buttons = container.querySelectorAll('[data-tab]');
        const contents = Array.from(container.querySelectorAll('.tab-content'));
        buttons.forEach(button => {
            if (button.getAttribute('data-tab') === tabName) {
                button.classList.add('border-b-2', 'border-brand', 'text-brand', 'font-semibold');
            } else {
                button.classList.remove('border-b-2', 'border-brand', 'text-brand', 'font-semibold');
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
    // Set up click handlers for both graphics and AV panels
    document.querySelectorAll('.graphics-panel [data-tab]').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            setActiveTab(tabName, '.graphics-panel');
        });
    });
    document.querySelectorAll('.av-panel [data-tab]').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');
            setActiveTab(tabName, '.av-panel');
        });
    });
    // Always show the first tab as active on load (no cache)
    setActiveTab('holdslate', '.graphics-panel');
    setActiveTab('vts', '.av-panel');
}

function updateGraphicsTabs(type) {
    const tabBar = document.getElementById('graphics-tabs');
    if (!tabBar) return;
    const sports = ['scoreboard','lineups','stats','teams','sport'];
    sports.forEach(t => {
        const btn = tabBar.querySelector(`[data-tab="${t}"]`);
        const panel = document.getElementById(`${t}-panel`);
        if (btn && panel) {
            if (type === 'sports') {
                btn.classList.remove('hidden');
                panel.classList.add('hidden');
            } else {
                btn.classList.add('hidden');
                panel.classList.add('hidden');
            }
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
    // Initialize tab system first
    setupTabs();
    const cutBtn = document.getElementById('cut-button');
    if (cutBtn) cutBtn.onclick = () => { cutToProgram(); };
    
    // Top bar
    const topBar = document.createElement('top-bar');
    topBar.setAttribute('event-type', eventData.eventType || 'corporate');
    if (currentUserId === 'ryanadmin') topBar.setAttribute('is-admin','true');
    topBar.addEventListener('logout', logout);
    topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
    topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ userId: currentUserId }); modal.classList.remove('hidden'); });
    topBar.addEventListener('event-type-change', async e => {
        const newType = e.detail;
        await updateEventMetadata(eventId, { ...eventData, eventType: newType });
        eventData.eventType = newType;
        renderGraphicsPanel(document.getElementById('lower-thirds-panel'), { ...eventData }, graphicsMode);
        updateGraphicsTabs(newType);
        if (newType === 'sports') {
            renderSportPanel(document.getElementById('sport-panel'), eventData, async (id, sport) => {
                await updateEventMetadata(eventId, { ...eventData, sport });
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

    // Status bar
    renderStatusBar(document.getElementById('status-bar'), eventData);
    
    updateGraphicsTabs(eventData.eventType || 'corporate');
    if ((eventData.eventType || 'corporate') === 'sports') {
        renderSportPanel(document.getElementById('sport-panel'), eventData, async (id, sport) => {
            await updateEventMetadata(eventId, { ...eventData, sport });
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

    // Initialize main content panels
    renderHoldslatePanel(document.getElementById('holdslate-panel'), onOverlayStateChange);
    renderGraphicsPanel(document.getElementById('lower-thirds-panel'), eventData, graphicsMode);

    // Initialize AV panels
    renderVtsPanel(document.getElementById('vts-panel'), eventId, vt => { loadedVT = vt; window.loadedVT = vt; });
    renderMusicPanel(document.getElementById('music-panel'), eventId);
    renderActiveGraphicsPanel(document.getElementById('active-graphics'), eventId, graphicsMode);
    renderBrandingPanel(document.getElementById('branding-panel'), eventId);

    setupAudioControls();
    
    // Initialize other panels
    await renderInputSourcesBar(document.getElementById('input-sources'), eventData);
    renderObsControls(document.getElementById('obs-controls'), eventData);
    renderAtemControls(document.getElementById('atem-controls'), eventData);
    renderPtzControls(document.getElementById('ptz-controls'), eventData);

    // Initialize modals in hidden state
    const brandingModal = document.getElementById('branding-modal');
    renderBrandingModal(brandingModal, { eventId });
    brandingModal.classList.add('hidden');

    renderProfileWizard(document.getElementById('profile-wizard'), eventData);
    renderCalendarDrawer(document.getElementById('calendar-drawer'), eventData);
    
    // Footer button handlers
    const brandingBtn = document.getElementById('footer-branding');
    if (brandingBtn) {
        brandingBtn.onclick = () => {
            renderBrandingModal(brandingModal, { eventId });
            brandingModal.classList.remove('hidden');
        };
    }

    const footerButtons = {
        'footer-obs-record': 'OBS Recording',
        'footer-obs-stream': 'OBS Streaming',
        'footer-atem-record': 'ATEM Recording',
        'footer-atem-stream': 'ATEM Streaming'
    };

    Object.entries(footerButtons).forEach(([id, label]) => {
        const button = document.getElementById(id);
        if (button) {
            button.onclick = () => alert(`${label} toggled (demo)`);
        }
    });
}

// Called by programPreview/holdslatePanel when overlay state changes
function onOverlayStateChange(state) {
    updateOverlayState(eventId, state);
}

let masterVolume = 1;
let vtVolume = 1;
let musicVolume = 1;
window.masterVolume = masterVolume;
window.vtVolume = vtVolume;
window.musicVolume = musicVolume;

function setupAudioControls() {
    const master = document.getElementById('audio-master');
    const vt = document.getElementById('audio-vt');
    const music = document.getElementById('audio-music');
    const update = () => {
        updateOverlayState(eventId, { masterVolume, vtVolume, musicVolume });
        window.masterVolume = masterVolume;
        window.vtVolume = vtVolume;
        window.musicVolume = musicVolume;
        if (window.musicPlayer && window.musicPlayer.setVolume) {
            window.musicPlayer.setVolume(masterVolume * musicVolume);
        }
        if (window.vtPlayer && window.vtPlayer.setVolume) {
            window.vtPlayer.setVolume(masterVolume * vtVolume);
        }
    };
    if (master) {
        master.value = masterVolume;
        master.oninput = () => { masterVolume = parseFloat(master.value); update(); };
    }
    if (vt) {
        vt.value = vtVolume;
        vt.oninput = () => { vtVolume = parseFloat(vt.value); update(); };
    }
    if (music) {
        music.value = musicVolume;
        music.oninput = () => { musicVolume = parseFloat(music.value); update(); };
    }
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

// Require login then initialize
requireAuth(`control.html?event_id=${eventId}`).then(user => initializeApp(user));
