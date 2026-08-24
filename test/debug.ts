import {AtomicInteger} from "../src/utils/collection/AtomicInteger.ts";


export class ObjGCWatchdog<T extends Object> {
    private readonly id = new AtomicInteger();
    private readonly weakRefs = new Map<number, WeakRef<T>>();
    private watched = new WeakMap<T, number>();
    private registry: FinalizationRegistry<TrackEntry>;

    public constructor() {
        this.onCleanup = this.onCleanup.bind(this);
        this.registry = new FinalizationRegistry<TrackEntry>(this.onCleanup);
    }

    public watch(obj: T): void {
        if (this.watched.has(obj)) return;

        const idx = this.id.getAndIncrement();
        this.watched.set(obj, idx);
        this.weakRefs.set(idx, new WeakRef(obj));
        this.registry.register(obj, {id: idx, label: this.describe(obj)}, obj);
    }

    public checkAlive(): T[] {
        const stillAlive: T[] = [];
        for (const weakRef of this.weakRefs.values()) {
            const entity = weakRef.deref();
            if (entity) stillAlive.push(entity);
        }
        return stillAlive;
    }

    public aliveCount(): number {
        let count = 0;
        for (const weakRef of this.weakRefs.values()) {
            if (weakRef.deref()) count++;
        }
        return count;
    }

    public reset(): void {
        this.weakRefs.clear();
        this.watched = new WeakMap();
    }

    private describe(obj: T): string {
        const name = obj.constructor?.name ?? 'Object';
        return `${name}(${obj.toString()})`;
    }

    private onCleanup(entry: TrackEntry) {
        this.weakRefs.delete(entry.id);
        console.log(`对象 ${entry.label} (#${entry.id}) 已被垃圾回收, 剩余: ${this.aliveCount()}`);
    }
}

interface TrackEntry {
    id: number;
    label: string;
}