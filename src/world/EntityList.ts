import {Entity} from "../entity/Entity.ts";

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

    public values() {
        return this.entities.values();
    }

    public processRemovals(): void {
        for (const id of this.pendingRemoval) {
            this.entities.delete(id);
        }
        this.pendingRemoval.length = 0;
    }

    /**
     * 立即触发延迟删除, 同时重置实体ID计数.
     *
     * 注意, 只清空维护的列表, 你不应该直接调用这个方法, 或许你需要
     * @see Entity.discard()
     * */
    public clear(): void {
        this.processRemovals();
        this.entities.clear();
        this.pendingRemoval.length = 0;
        Entity.CURRENT_ID.reset();
    }

    public get size(): number {
        return this.entities.size;
    }
}