import type {IEvents} from "../type/IEvents.ts";

type Listener<Payload> = (payload: Payload) => void;

export class GeneralEventBus<Events extends Record<string, any>> {
    private static GLOBAL_EVENT: GeneralEventBus<IEvents> | null = null;

    private readonly listeners: Map<keyof Events, Set<Listener<any>>> = new Map();

    public static getEventBus(): GeneralEventBus<IEvents> {
        if (!this.GLOBAL_EVENT) this.GLOBAL_EVENT = new GeneralEventBus<IEvents>();
        return this.GLOBAL_EVENT;
    }

    public on<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
        let set = this.listeners.get(type);
        if (!set) {
            set = new Set();
            this.listeners.set(type, set);
        }
        set.add(listener);
    }

    public once<K extends keyof Events>(type: K, listener: Listener<Events[K]>): void {
        const wrapper: Listener<Events[K]> = (payload) => {
            this.off(type, wrapper);
            listener(payload);
        };
        this.on(type, wrapper);
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

    public waitFor<K extends keyof Events>(type: K): Promise<Events[K]> {
        return new Promise(resolve => this.once(type, resolve));
    }

    public clear() {
        this.listeners.clear();
    }
}