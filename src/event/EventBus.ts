import type {Consumer} from "../type/types.ts";
import type {AppEvents} from "./AppEvents.ts";
import type {GameEvent} from "./events/GameEvent.ts";

export class EventBus {
    private static GLOBAL_EVENT: EventBus;

    private readonly listeners: Map<string, Set<Consumer<any>>> = new Map();

    public static instance(): EventBus {
        if (!this.GLOBAL_EVENT) this.GLOBAL_EVENT = new EventBus();
        return this.GLOBAL_EVENT;
    }

    public on<K extends keyof AppEvents>(
        type: K,
        handler: Consumer<AppEvents[K]>,
    ): void {
        const bucket = this.listeners.getOrInsertComputed(type, () => new Set());
        bucket.add(handler);
    }

    public once<K extends keyof AppEvents>(
        type: K,
        handler: Consumer<AppEvents[K]>,
    ): void {
        const wrapper: Consumer<AppEvents[K]> = (payload) => {
            this.off(type, wrapper);
            handler(payload);
        };
        this.on(type, wrapper);
    }

    public off<K extends keyof AppEvents>(
        type: K,
        handler: Consumer<AppEvents[K]>,
    ): void {
        const bucket = this.listeners.get(type);
        if (!bucket) return;

        bucket.delete(handler);
        if (bucket.size === 0) {
            this.listeners.delete(type);
        }
    }

    public emit(event: GameEvent): void {
        const bucket = this.listeners.get(event.type);
        if (!bucket) return;

        for (const listener of bucket) {
            if (event.isCanceled()) return;

            try {
                listener(event);
            } catch (err) {
                console.warn(`EventBus listener for "${event}" threw:`, err);
            }
        }
    }

    public removeAll<K extends keyof AppEvents>(type: K) {
        const bucket = this.listeners.get(type);
        if (!bucket) return;
        bucket.clear();
        this.listeners.delete(type);
    }

    public clear() {
        this.listeners.clear();
    }
}