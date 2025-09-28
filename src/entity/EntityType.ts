import type {Entity} from "./Entity.ts";
import {Registries} from "../registry/Registries.ts";
import {Registry} from "../registry/Registry.ts";
import {Identifier} from "../registry/Identifier.ts";
import {EntityDimensions} from "./EntityDimensions.ts";
import type {World} from "../world/World.ts";

type EntityFactory<T extends Entity> = new (...args: any[]) => T;

export class EntityType<T extends Entity> {
    public static register<T extends Entity>(id: string, type: InstanceType<typeof EntityType.Builder<T>>): EntityType<T> {
        return Registry.registerReferenceById(Registries.ENTITY_TYPE, Identifier.ofVanilla(id), type.build(id)).getValue();
    }

    public static getId(type: EntityType<any>) {
        return Registries.ENTITY_TYPE.getId(type);
    }

    public static get(id: string) {
        return Registries.ENTITY_TYPE.getById(Identifier.tryParse(id));
    }

    public static Builder = class Builder<T extends Entity> {
        private readonly factory: EntityFactory<T>;
        private dimensions = EntityDimensions.changing(1, 1);

        public constructor(factory: EntityFactory<T>) {
            this.factory = factory;
        }

        public static create<T extends Entity>(factory: EntityFactory<T>): Builder<T> {
            return new Builder(factory);
        }

        public setDimensions(width: number, height: number) {
            this.dimensions = EntityDimensions.changing(width, height);
            return this;
        }

        public build(_id: string) {
            return new EntityType(this.factory, this.dimensions);
        }
    }
    private readonly factory: EntityFactory<T>;
    private readonly dimensions: EntityDimensions;

    public constructor(factory: EntityFactory<T>, dimensions: EntityDimensions) {
        this.factory = factory;
        this.dimensions = dimensions;
    }

    public getDimensions(): EntityDimensions {
        return this.dimensions;
    }

    public create(world: World, ...args: any[]): T {
        return new this.factory(this, world, ...args);
    }
}

