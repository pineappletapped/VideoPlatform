import { eventStorage } from './storage.js';
import { supabase } from './supabaseMock.js';
import { requireAuth } from './auth.js';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('event_id') || 'demo';

async function initializeMultiview() {
    try {
        const eventData = await eventStorage.loadEvent(eventId);
        document.getElementById('preview-window').textContent = 'Preview';
        document.getElementById('program-window').textContent = 'Program';
        document.getElementById('overlay-preview').textContent = 'Overlay';
        document.getElementById('status-panel').textContent = 'Status';
    } catch (error) {
        // Handle error
    }
}

requireAuth(`multiview.html?event_id=${eventId}`).then(initializeMultiview);
