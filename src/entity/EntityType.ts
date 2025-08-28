import type {Entity} from "./Entity.ts";
import {Registries} from "../registry/Registries.ts";
import {Registry} from "../registry/Registry.ts";
import {Identifier} from "../registry/Identifier.ts";
import {EntityDimensions} from "./EntityDimensions.ts";
import type {World} from "../world/World.ts";
import type {Constructor} from "../apis/registry.ts";


export class EntityType<T extends Entity> {
    private readonly factory: Constructor<T>;
    private readonly dimensions: EntityDimensions;

    public static register<T extends Entity>(id: string, type: InstanceType<typeof EntityType.Builder<T>>): EntityType<T> {
        return Registry.registerReferenceById(Registries.ENTITY_TYPE, Identifier.ofVanilla(id), type.build(id)).getValue();
    }

    public constructor(factory: Constructor<T>, dimensions: EntityDimensions) {
        this.factory = factory;
        this.dimensions = dimensions;
    }

    public getDimensions(): EntityDimensions {
        return this.dimensions;
    }

    public create(world: World, ...args: any[]): T {
        return new this.factory(this, world, ...args);
    }

    public static Builder = class Builder<T extends Entity> {
        private readonly factory: Constructor<T>;
        private dimensions = EntityDimensions.changing(1, 1);

        public constructor(factory: Constructor<T>) {
            this.factory = factory;
        }

        public static create<T extends Entity>(factory: Constructor<T>): Builder<T> {
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
}

