import type {Entity} from "../../entity/Entity.ts";
import type {EntityIndex} from "./EntityIndex.ts";
import type {EntityHandler} from "./EntityHandler.ts";
import {EntityMap} from "./EntityMap.ts";
import {EntityLookUp} from "./EntityLookUp.ts";
import {EMPTY_LISTENER, type EntityChangeListener} from "./EntityChangeListener.ts";
import {GridSpatialIndex} from "./GridSpatialIndex.ts";
import {World} from "../World.ts";


export class ClientEntityManager<T extends Entity> {
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

    public addEntity(entity: T): void {
        this.map.add(entity);
        this.index.insert(entity);

        entity.setChangeListener(this.createListener(entity));
        this.handler.startTicking(entity);
    }

    public remove(entity: T): void {
        this.index.remove(entity);
        this.map.remove(entity);
        this.handler.stopTicking(entity);
        entity.setChangeListener(EMPTY_LISTENER);
    }

    public clear(): void {
        this.map.iterate()
            .forEach(entity => this.remove(entity));
        this.index.clear();
    }

    public getLookup(): EntityLookUp<T> {
        return this.lookup;
    }

    private createListener(entity: T): EntityChangeListener {
        return new ClientEntityManager.EntityChangeListenerImpl(entity, this);
    }

    private static EntityChangeListenerImpl = class impl implements EntityChangeListener {
        private readonly entity: Entity;
        private readonly manager: ClientEntityManager<Entity>;

        public constructor(entity: Entity, manager: ClientEntityManager<Entity>) {
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