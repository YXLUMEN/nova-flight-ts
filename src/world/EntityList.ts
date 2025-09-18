import type {Entity} from "../entity/Entity.ts";

export class EntityList {
    private entities = new Map<number, Entity>();
    private pendingRemoval: number[] = [];

    public add(entity: Entity): void {
        this.entities.set(entity.getId(), entity);
    }

    public remove(entity: Entity): void {
        this.pendingRemoval.push(entity.getId());
    }

    public has(entity: Entity): boolean {
        return this.entities.has(entity.getId());
    }

    public forEach(action: (entity: Entity) => void): void {
        for (const entity of this.entities.values()) {
            action(entity);
        }
    }

    public processRemovals(): void {
        for (const id of this.pendingRemoval) {
            this.entities.delete(id);
        }
        this.pendingRemoval.length = 0;
    }

    public clear(): void {
        this.entities.clear();
    }

    public get size(): number {
        return this.entities.size;
    }
}