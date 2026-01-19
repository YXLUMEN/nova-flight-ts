import {EntityIndex} from "./EntityIndex.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import {SpatialGrid} from "./SpatialGrid.ts";
import {World} from "../World.ts";
import {EntityLookUp} from "./EntityLookUp.ts";


export class ServerEntityManager<T extends Entity> {
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

    public addEntity(entity: T, existed = false): boolean {
        if (!this.index.add(entity)) {
            return false;
        }

        // this.grid.insert(entity);
        if (!existed) {
            this.handler.startTicking(entity);
        }
        return true;
    }

    public addEntities(entities: Iterable<T>): void {
        for (const entity of entities) {
            this.addEntity(entity);
        }
    }

    public remove(entity: T) {
        this.index.remove(entity);
        // this.grid.remove(entity);

        this.handler.stopTicking(entity);
    }

    public clear(): void {
        this.index.iterate().forEach(entity => {
            this.remove(entity);
        });
    }

    public getIndexSize(): number {
        return this.index.size;
    }

    public getLookup() {
        return this.lookup;
    }
}