import type {IEvents} from "../type/IEvents.ts";
import type {Consumer} from "../type/types.ts";

export class GeneralEventBus<Events extends Record<string, any>> {
    private static GLOBAL_EVENT: GeneralEventBus<IEvents> | null = null;

    public static getEventBus(): GeneralEventBus<IEvents> {
        if (!this.GLOBAL_EVENT) this.GLOBAL_EVENT = new GeneralEventBus<IEvents>();
        return this.GLOBAL_EVENT;
    }

    private readonly listeners: Map<keyof Events, Set<Consumer<any>>> = new Map();

    public on<K extends keyof Events>(event: K, listener: Consumer<Events[K]>): void {
        const bucket = this.listeners.getOrInsertComputed(event, () => new Set());
        bucket.add(listener);
    }

    public once<K extends keyof Events>(event: K, listener: Consumer<Events[K]>): void {
        const wrapper: Consumer<Events[K]> = (payload) => {
            this.off(event, wrapper);
            listener(payload);
        };
        this.on(event, wrapper);
    }

    public off<K extends keyof Events>(event: K, listener: Consumer<Events[K]>): void {
        const bucket = this.listeners.get(event);
        if (!bucket) return;

        bucket.delete(listener);
        if (bucket.size === 0) {
            this.listeners.delete(event);
        }
    }

    public emit<K extends keyof Events>(event: K, payload: Events[K]): void {
        const bucket = this.listeners.get(event);
        if (!bucket) return;

        for (const listener of bucket) {
            try {
                listener(payload);
            } catch (err) {
                console.warn(`EventBus listener for "${String(event)}" threw:`, err);
            }
        }
    }

    public waitFor<K extends keyof Events>(event: K): Promise<Events[K]> {
        return new Promise(resolve => this.once(event, resolve));
    }

    public clear() {
        this.listeners.clear();
    }
}