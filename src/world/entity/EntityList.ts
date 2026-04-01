import {Entity} from "../../entity/Entity.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {Consumer} from "../../type/types.ts";
import type {EntityType} from "../../entity/EntityType.ts";

export class EntityList {
    private readonly entities = new Map<number, Entity>();
    private readonly mobs = new Set<MobEntity>();

    private readonly pendingRemoval: number[] = [];

    public get size(): number {
        return this.entities.size;
    }

    public add(entity: Entity): void {
        this.entities.set(entity.getId(), entity);

        if (entity instanceof MobEntity) {
            this.mobs.add(entity);
        }
    }

    public remove(entity: Entity): void {
        this.pendingRemoval.push(entity.getId());
    }

    public has(entity: Entity): boolean {
        return this.entities.has(entity.getId());
    }

    public forEach(action: Consumer<Entity>): void {
        for (const entity of this.entities.values()) {
            action(entity);
        }
    }

    public values(): MapIterator<Entity> {
        return this.entities.values();
    }

    public* getTypes(type: EntityType<any>): Iterator<Entity> {
        for (const entity of this.entities.values()) {
            if (entity.getType() === type) {
                yield entity;
            }
        }
    }

    public getMobs(): ReadonlySet<MobEntity> {
        return this.mobs;
    }

    public processRemovals(): void {
        for (const id of this.pendingRemoval) {
            const entity = this.entities.get(id);
            if (!entity) continue;

            if (entity instanceof MobEntity) {
                this.mobs.delete(entity);
            }

            this.entities.delete(id);
        }
        this.pendingRemoval.length = 0;
    }

    /**
     * 立即触发延迟删除
     *
     * 注意, 只清空维护的列表, 你不应该直接调用这个方法, 或许你需要
     * @see Entity.discard()
     * */
    public clear(): void {
        this.processRemovals();
        this.entities.clear();
        this.mobs.clear();

        this.pendingRemoval.length = 0;
    }
}