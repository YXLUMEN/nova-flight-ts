type EventType = string;
type EventPayload = unknown;
type Listener = (payload: EventPayload) => void;

export class EventBus {
    private readonly listeners: Map<EventType, Set<Listener>> = new Map();

    public on(type: EventType, listener: Listener): void {
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener);
    }

    public off(type: EventType, listener: Listener): void {
        const set = this.listeners.get(type);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) {
            this.listeners.delete(type);
        }
    }

    public emit(type: EventType, payload: EventPayload) {
        const set = this.listeners.get(type);
        if (!set) return;
        for (const fn of set) {
            try {
                fn(payload);
            } catch (err) {
                console.warn(`EventBus listener for "${type}" threw:`, err);
            }
        }
    }

    public clear() {
        this.listeners.clear();
    }
}