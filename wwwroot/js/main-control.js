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
import { renderObsControls } from './components/obsControls.js';
import { renderAtemControls } from './components/atemControls.js';
import { renderPtzControls } from './components/ptzControls.js';
import { renderBrandingModal } from './components/brandingModal.js';
import { renderProfileWizard } from './components/profileWizard.js';
import { renderCalendarDrawer } from './components/calendarDrawer.js';
import { renderHoldslatePanel } from './components/holdslatePanel.js';
import { updateOverlayState, getOverlayState, getEventMetadata, updateEventMetadata } from './firebase.js';
import { renderVtsPanel } from './components/vtsPanel.js';
import { renderMusicPanel } from './components/musicPanel.js';

// Get event ID from URL params
const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let loadedVT = null;

async function initializeApp() {
    let firebaseStatus = 'Connecting to Firebase...';
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
    const sports = ['scoreboard','lineups','stats','teams'];
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
    if (scheduleBtn && schedulePanel) {
        if (type === 'sports') {
            scheduleBtn.classList.add('hidden');
            schedulePanel.classList.add('hidden');
        } else {
            scheduleBtn.classList.remove('hidden');
        }
    }
}

function setupEventTypeSelector(eventData) {
    const selector = document.getElementById('event-type');
    if (!selector) return;

    // Set initial value from event metadata
    if (eventData.eventType) {
        selector.value = eventData.eventType;
    }
    updateGraphicsTabs(selector.value);

    selector.addEventListener('change', async () => {
        const newType = selector.value;
        await updateEventMetadata(eventId, { ...eventData, eventType: newType });

        // Refresh graphics panel with new event type
        renderGraphicsPanel(document.getElementById('lower-thirds-panel'), {
            ...eventData,
            eventType: newType
        });
        updateGraphicsTabs(newType);
        if (newType === 'sports') {
            renderScoreboardPanel(document.getElementById('scoreboard-panel'));
            renderLineupPanel(document.getElementById('lineups-panel'));
            renderStatsPanel(document.getElementById('stats-panel'));
            renderTeamsPanel(document.getElementById('teams-panel'), eventId);
        } else {
            renderProgramPreview(document.getElementById('schedule-panel'), eventData, onOverlayStateChange);
        }
    });
}


async function initializeComponents(eventData) {
    // Initialize tab system first
    setupTabs();
    
    // Top bar
    const topBar = document.createElement('top-bar');
    document.getElementById('top-bar').appendChild(topBar);

    // Status bar
    renderStatusBar(document.getElementById('status-bar'), eventData);
    
    // Setup event type selector
    setupEventTypeSelector(eventData);
    updateGraphicsTabs(eventData.eventType || 'corporate');
    if ((eventData.eventType || 'corporate') === 'sports') {
        renderScoreboardPanel(document.getElementById('scoreboard-panel'));
        renderLineupPanel(document.getElementById('lineups-panel'));
        renderStatsPanel(document.getElementById('stats-panel'));
        renderTeamsPanel(document.getElementById('teams-panel'), eventId);
    } else {
        renderProgramPreview(document.getElementById('schedule-panel'), eventData, onOverlayStateChange);
    }

    // Initialize main content panels
    renderHoldslatePanel(document.getElementById('holdslate-panel'), onOverlayStateChange);
    renderGraphicsPanel(document.getElementById('lower-thirds-panel'), eventData);

    // Initialize AV panels
    renderVtsPanel(document.getElementById('vts-panel'), eventId, vt => {
        loadedVT = vt;
        window.loadedVT = vt;
    });
    renderMusicPanel(document.getElementById('music-panel'), eventId);

    setupAudioControls();
    
    // Initialize other panels
    await renderInputSourcesBar(document.getElementById('input-sources'), eventData);
    renderObsControls(document.getElementById('obs-controls'), eventData);
    renderAtemControls(document.getElementById('atem-controls'), eventData);
    renderPtzControls(document.getElementById('ptz-controls'), eventData);

    // Initialize modals in hidden state
    const brandingModal = document.getElementById('branding-modal');
    renderBrandingModal(brandingModal, eventData);
    brandingModal.classList.add('hidden');

    renderProfileWizard(document.getElementById('profile-wizard'), eventData);
    renderCalendarDrawer(document.getElementById('calendar-drawer'), eventData);
    
    // Footer button handlers
    const brandingBtn = document.getElementById('footer-branding');
    if (brandingBtn) {
        brandingBtn.onclick = () => {
            renderBrandingModal(brandingModal, eventData);
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

// Initialize the app
initializeApp();
