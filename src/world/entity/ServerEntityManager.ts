import type {Entity} from "../../entity/Entity.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import type {EntityIndex} from "./EntityIndex.ts";
import {EntityMap} from "./EntityMap.ts";
import {EntityLookUp} from "./EntityLookUp.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "./EntityChangeListener.ts";
import {World} from "../World.ts";
import {GridSpatialIndex} from "./GridSpatialIndex.ts";


export class ServerEntityManager<T extends Entity> {
    private readonly map: EntityMap<T>;
    private readonly index: EntityIndex<T>;
    private readonly lookup: EntityLookUp<T>
    private readonly handler: EntityHandler<T>;

    public constructor(handler: EntityHandler<T>) {
        this.map = new EntityMap();
        this.index = new GridSpatialIndex(World.MAP_WIDTH, World.MAP_HEIGHT, 80, 160);
        this.lookup = new EntityLookUp(this.map, this.index);
        this.handler = handler;
    }

    public addEntity(entity: T): boolean {
        if (!this.map.add(entity)) {
            return false;
        }
        this.index.insert(entity);
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
        this.index.remove(entity);
        this.map.remove(entity);

        this.handler.stopTicking(entity);
        this.handler.stopTracking(entity);
        entity.setChangeListener(EMPTY_LISTENER);
    }

    public clear(): void {
        this.map.iterate().forEach(entity => {
            this.remove(entity);
        });
        this.index.clear();
    }

    public getIndexSize(): number {
        return this.map.size;
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
            this.manager.index.insert(this.entity);
        }

        public remove(): void {
            this.manager.remove(this.entity);
        }
    }
}