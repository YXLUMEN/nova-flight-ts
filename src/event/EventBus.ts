type Listener<Payload> = (payload: Payload) => void;

export class EventBus<Events extends Record<string, any>> {
    private static GLOBAL_EVENT: EventBus<any> | null = null;

    private readonly listeners: Map<keyof Events, Set<Listener<any>>> = new Map();

    public static getEventBus<E extends Record<string, any>>(): EventBus<E> {
        if (!this.GLOBAL_EVENT) this.GLOBAL_EVENT = new EventBus<E>();
        return this.GLOBAL_EVENT as EventBus<E>;
    }

    public on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener);
    }

    public off<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
        const set = this.listeners.get(type);
        if (!set) return;
        set.delete(listener);
        if (set.size === 0) {
            this.listeners.delete(type);
        }
    }

    public emit<K extends keyof Events>(type: K, payload: Events[K]): void {
        const set = this.listeners.get(type);
        if (!set) return;
        for (const fn of set) {
            try {
                fn(payload);
            } catch (err) {
                console.warn(`EventBus listener for "${String(type)}" threw:`, err);
            }
        }
    }

    public clear() {
        this.listeners.clear();
    }
}