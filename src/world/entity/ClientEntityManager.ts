import type {Entity} from "../../entity/Entity.ts";
import {EntityIndex} from "./EntityIndex.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import {SpatialGrid} from "./SpatialGrid.ts";
import {EntityLookUp} from "./EntityLookUp.ts";
import {World} from "../World.ts";

export class ClientEntityManager<T extends Entity> {
    private readonly index: EntityIndex<T>;
    private readonly grid: SpatialGrid<T>;
    private readonly lookup: EntityLookUp<T>;
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.index = new EntityIndex();
        this.grid = new SpatialGrid(World.WORLD_W, World.WORLD_H);
        this.lookup = new EntityLookUp(this.index, this.grid);

        this.handler = handler;
    }

    public addEntity(entity: T): void {
        this.index.add(entity);
        // this.grid.insert(entity);
        this.handler.startTicking(entity);
    }

    public remove(entity: T) {
        this.index.remove(entity);
        // this.grid.remove(entity);
        this.handler.stopTicking(entity);
    }

    public clear() {
        this.index.iterate().forEach(entity => this.remove(entity));
    }

    public getLookup() {
        return this.lookup;
    }
}