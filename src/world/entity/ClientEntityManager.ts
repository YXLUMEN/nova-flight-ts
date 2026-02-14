import type {Entity} from "../../entity/Entity.ts";
import {EntityIndex} from "./EntityIndex.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import {GridSpatialIndex} from "./GridSpatialIndex.ts";
import {EntityLookUp} from "./EntityLookUp.ts";
import {World} from "../World.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "./EntityChangeListener.ts";

export class ClientEntityManager<T extends Entity> {
    private readonly index: EntityIndex<T>;
    private readonly grid: GridSpatialIndex<T>;
    private readonly lookup: EntityLookUp<T>
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.index = new EntityIndex();
        this.grid = new GridSpatialIndex(World.WORLD_W, World.WORLD_H);
        this.lookup = new EntityLookUp(this.index, this.grid);
        this.handler = handler;
    }

    public addEntity(entity: T): void {
        this.index.add(entity);
        entity.setChangeListener(this.createListener(entity));

        this.handler.startTicking(entity);
    }

    public remove(entity: T): void {
        this.index.remove(entity);
        this.handler.stopTicking(entity);
        entity.setChangeListener(EMPTY_LISTENER);
    }

    public clear(): void {
        this.index.iterate()
            .forEach(entity => this.remove(entity));
    }

    public getLookup(): EntityLookUp<T> {
        return this.lookup;
    }

    private createListener(entity: T): EntityChangeListener {
        const self = this;
        return {
            updateEntityPosition() {
            },
            remove() {
                self.remove(entity);
            }
        }
    }
}