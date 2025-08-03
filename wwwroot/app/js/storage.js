// Storage service for managing event data
export class EventStorage {
    constructor() {
        this.eventData = null;
        this.listeners = new Set();
    }

    async loadEvent(eventId) {
        if (eventId === 'demo') {
            try {
                const response = await fetch(`assets/${eventId}-event.json`);
                if (response.ok) {
                    this.eventData = await response.json();
                }
            } catch (error) {
                console.warn('Event file missing, starting blank', error);
            }
        }
        if (!this.eventData) {
            // Initialize a blank event when no JSON exists
            this.eventData = {
                id: eventId,
                title: eventId,
                graphics: { lowerThirds: [], titleSlides: [] }
            };
        }
        this.notifyListeners();
        return this.eventData;
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