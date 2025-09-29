import type {Entity} from "../entity/Entity.ts";

export class EntityIndex<T extends Entity> {
    private readonly idToEntity = new Map<number, T>;
    private readonly uuidToEntity = new Map<string, T>();

    public add(entity: T): boolean {
        const uuid = entity.getUuid();
        if (this.uuidToEntity.has(uuid)) {
            console.warn(`Duplicate entity UUID ${uuid}: ${entity}`);
            return false;
        }
        this.uuidToEntity.set(uuid, entity);
        this.idToEntity.set(entity.getId(), entity);
        return true;
    }

    public remove(entity: T) {
        this.uuidToEntity.delete(entity.getUuid());
        this.idToEntity.delete(entity.getId());
    }

    public get(id: number): T | null {
        return this.idToEntity.get(id) ?? null;
    }

    public getByUUID(uuid: string): T | null {
        return this.uuidToEntity.get(uuid) ?? null;
    }

    public uuidValues() {
        return this.uuidToEntity.keys();
    }

    public get size() {
        return this.uuidToEntity.size;
    }
}