import {EntityIndex} from "./EntityIndex.ts";
import type {Entity} from "../entity/Entity.ts";
import type {EntityHandler} from "./EntityHandler.ts";


export class ServerEntityManager<T extends Entity> {
    private readonly index: EntityIndex<T>;
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.index = new EntityIndex();
        this.handler = handler;
    }

    public addEntity(entity: T, existed = false): boolean {
        if (!this.index.add(entity)) {
            return false;
        }

        if (existed) return true;
        this.handler.startTicking(entity);
        return true;
    }

    public addEntities(entities: Iterable<T>): void {
        for (const entity of entities) {
            this.addEntity(entity);
        }
    }

    public remove(entity: T) {
        this.index.remove(entity);
        this.handler.stopTicking(entity);
    }

    public clear() {
        this.index.uuidValues().forEach(uuid => {
            const entity = this.index.getByUUID(uuid);
            if (entity) this.remove(entity);
        });
    }

    public getIndex() {
        return this.index;
    }
}