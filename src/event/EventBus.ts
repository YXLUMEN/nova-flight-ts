type EventType = string;
type EventPayload = any;

type Listener = (payload: EventPayload) => void;

export class EventBus {
    private readonly listeners: Map<EventType, Listener[]> = new Map();

    public on(type: EventType, listener: Listener) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type)!.push(listener);
    }

    public off(type: EventType, listener: Listener) {
        const list = this.listeners.get(type);
        if (list) {
            const index = list.indexOf(listener);
            if (index >= 0) list.splice(index, 1);
        }
    }

    public emit(type: EventType, payload: EventPayload) {
        const list = this.listeners.get(type);
        if (!list) return;
        for (const fn of list) {
            try {
                fn(payload);
            } catch (err) {
                console.warn("EventBus error:", err);
            }
        }
    }

    public clear() {
        this.listeners.clear();
    }
}