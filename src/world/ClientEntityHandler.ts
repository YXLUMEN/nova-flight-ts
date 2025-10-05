import type {Entity} from "../entity/Entity.ts";
import {EntityIndex} from "./EntityIndex.ts";
import type {EntityHandler} from "./EntityHandler.ts";

export class ClientEntityHandler<T extends Entity> {
    private readonly index: EntityIndex<T>;
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.index = new EntityIndex();
        this.handler = handler;
    }

    public addEntity(entity: T): void {
        this.index.add(entity);
        this.handler.startTicking(entity);
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