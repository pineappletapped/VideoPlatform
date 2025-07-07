// Mock Supabase client for future integration
class SupabaseMock {
    constructor() {
        this.subscribers = new Map();
    }

    // Mock real-time subscription
    channel(channel) {
        return {
            on: (event, callback) => {
                if (!this.subscribers.has(channel)) {
                    this.subscribers.set(channel, new Map());
                }
                this.subscribers.get(channel).set(event, callback);
                return this;
            },
            subscribe: () => {
                console.log(`Subscribed to ${channel}`);
                return Promise.resolve(this);
            }
        };
    }

    // Mock data fetch
    from(table) {
        return {
            select: () => {
                return Promise.resolve({ data: [], error: null });
            },
            insert: (data) => {
                return Promise.resolve({ data: [data], error: null });
            },
            update: (data) => {
                return Promise.resolve({ data: [data], error: null });
            }
        };
    }
}

export const supabase = new SupabaseMock();
export default supabase;