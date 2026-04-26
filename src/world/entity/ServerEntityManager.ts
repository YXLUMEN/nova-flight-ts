import {EntityIndex} from "./EntityIndex.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import {GridSpatialIndex} from "./GridSpatialIndex.ts";
import {EntityLookUp} from "./EntityLookUp.ts";
import {World} from "../World.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "./EntityChangeListener.ts";


export class ServerEntityManager<T extends Entity> {
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

    public addEntity(entity: T): boolean {
        if (!this.index.add(entity)) {
            return false;
        }
        this.grid.insert(entity);
        entity.setChangeListener(this.createListener(entity));

        // 可能进行区分
        this.handler.startTicking(entity);
        this.handler.startTracking(entity);
        return true;
    }

    public addEntities(entities: Iterable<T>): void {
        for (const entity of entities) {
            this.addEntity(entity);
        }
    }

    public remove(entity: T) {
        this.grid.remove(entity);
        this.index.remove(entity);

        this.handler.stopTicking(entity);
        this.handler.stopTracking(entity);
        entity.setChangeListener(EMPTY_LISTENER);
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

    private createListener(entity: T): EntityChangeListener {
        return new ServerEntityManager.EntityChangeListenerImpl(entity, this);
    }

    private static EntityChangeListenerImpl = class impl implements EntityChangeListener {
        private readonly entity: Entity;
        private readonly manager: ServerEntityManager<Entity>;

        public constructor(entity: Entity, manager: ServerEntityManager<Entity>) {
            this.entity = entity;
            this.manager = manager;
        }

        public updateEntityPosition(): void {
            this.manager.grid.insert(this.entity);
        }

        public remove(): void {
            this.manager.remove(this.entity);
        }
    }
}