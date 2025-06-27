// Storage service for managing event data
export class EventStorage {
    constructor() {
        this.eventData = null;
        this.listeners = new Set();
    }

    async loadEvent(eventId) {
        try {
            const response = await fetch(`assets/${eventId}-event.json`);
            if (!response.ok) throw new Error('Event not found');
            this.eventData = await response.json();
            this.notifyListeners();
            return this.eventData;
        } catch (error) {
            console.error('Failed to load event:', error);
            throw error;
        }
    }

    subscribe(callback) {
        this.listeners.add(callback);
        if (this.eventData) callback(this.eventData);
        return () => this.listeners.delete(callback);
    }

    notifyListeners() {
        this.listeners.forEach(callback => callback(this.eventData));
    }

    getCurrentEvent() {
        return this.eventData;
    }
}

export const eventStorage = new EventStorage();
export default eventStorage;