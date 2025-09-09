import type {Entity} from "./Entity.ts";

export class EntityList {
    private entities = new Map<number, Entity>();

    public add(entity: Entity): void {
        this.entities.set(entity.getId(), entity);
    }

    public remove(entity: Entity): void {
        this.entities.delete(entity.getId());
    }

    public has(entity: Entity): boolean {
        return this.entities.has(entity.getId());
    }

    public forEach(action: (entity: Entity) => void): void {
        for (const entity of this.entities.values()) {
            action(entity);
        }
    }

    public iterate() {
        return this.entities.values();
    }

    public clear(): void {
        this.entities.clear();
    }

    public get size(): number {
        return this.entities.size;
    }
}