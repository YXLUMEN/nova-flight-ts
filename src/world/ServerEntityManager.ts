import {EntityIndex} from "./EntityIndex.ts";
import type {Entity} from "../entity/Entity.ts";

interface EntityHandler<T extends Entity> {
    startTicking(entity: T): void;

    stopTicking(entity: T): void;
}

export class ServerEntityManager<T extends Entity> {
    private readonly entityUUIDs = new Set<string>();
    private readonly index: EntityIndex<T>;
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.index = new EntityIndex();
        this.handler = handler;
    }

    private addEntityUuid(entity: T): boolean {
        const uuid = entity.getUuid();
        if (this.entityUUIDs.has(uuid)) {
            return false;
        }

        this.entityUUIDs.add(uuid);
        return true;
    }

    public addEntity(entity: T): boolean {
        if (!this.addEntityUuid(entity)) {
            return false;
        }

        this.index.add(entity);
        this.handler.startTicking(entity);
        return true
    }

    public addEntities(entities: Iterable<T>): void {
        for (const entity of entities) {
            this.addEntity(entity);
        }
    }

    public remove(entity: T) {
        this.entityUUIDs.delete(entity.getUuid());
        this.index.remove(entity);
        this.handler.stopTicking(entity);
    }

    public getIndex() {
        return this.index;
    }
}