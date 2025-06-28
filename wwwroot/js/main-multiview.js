import { eventStorage } from './storage.js';
import { supabase } from './supabaseMock.js';
import { requireAuth, logout } from './auth.js';
import { renderBrandingModal } from './components/brandingModal.js';
import './components/topBar.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

let currentUserId = '';

async function initializeMultiview(user) {
    currentUserId = user ? user.uid.replace('local-','') : '';
    try {
        const eventData = await eventStorage.loadEvent(eventId);
        const topBar = document.createElement('top-bar');
        if (currentUserId === 'ryanadmin') topBar.setAttribute('is-admin','true');
        topBar.addEventListener('logout', logout);
        topBar.addEventListener('edit-account', () => alert('Edit account not implemented'));
        topBar.addEventListener('brand-settings', () => { const modal=document.getElementById('branding-modal'); renderBrandingModal(modal,{ userId: currentUserId }); modal.classList.remove('hidden'); });
        document.body.prepend(topBar);
        document.getElementById('preview-window').textContent = 'Preview';
        document.getElementById('program-window').textContent = 'Program';
        document.getElementById('overlay-preview').textContent = 'Overlay';
        document.getElementById('status-panel').textContent = 'Status';
    } catch (error) {
        // Handle error
    }
}

requireAuth(`multiview.html?event_id=${eventId}`).then(u => initializeMultiview(u));
