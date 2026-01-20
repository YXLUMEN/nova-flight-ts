import type {Entity} from "../../entity/Entity.ts";
import {EntityIndex} from "./EntityIndex.ts";
import type {EntityHandler} from "./EntityHandler.ts";

export class ClientEntityManager<T extends Entity> {
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
        this.index.iterate().forEach(entity => this.remove(entity));
    }

    public getLookup() {
        return this.index;
    }
}