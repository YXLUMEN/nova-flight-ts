import type {Entity} from "./Entity.ts";
import {Registries} from "../registry/Registries.ts";
import {Registry} from "../registry/Registry.ts";
import {Identifier} from "../registry/Identifier.ts";
import {EntityDimensions} from "./EntityDimensions.ts";
import type {Constructor} from "../apis/types.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";

export class EntityType<T extends Entity, F extends Constructor<T> = Constructor<T>> {
    public static readonly PACKET_CODEC = PacketCodecs.registryEntry(Registries.ENTITY_TYPE);
    private readonly id: Identifier;
    private readonly factory: F;
    private readonly trackTickInterval: number;
    private readonly dimensions: EntityDimensions;

    public constructor(id: Identifier, factory: F, dimensions: EntityDimensions, trackTickInterval: number) {
        this.id = id;
        this.factory = factory;
        this.dimensions = dimensions;
        this.trackTickInterval = trackTickInterval;
    }

    public static register<T extends Entity>(id: string, type: InstanceType<typeof EntityType.Builder<T>>): EntityType<T> {
        return Registry.registerReferenceById(
            Registries.ENTITY_TYPE,
            Identifier.ofVanilla(id),
            type.build(id)
        ).getValue();
    }

    public static getId(type: EntityType<any>): Identifier | null {
        return Registries.ENTITY_TYPE.getId(type);
    }

    public static get<T extends Entity>(id: string): EntityType<T> | null {
        return Registries.ENTITY_TYPE.getById(Identifier.tryParse(id));
    }

    public getDimensions(): EntityDimensions {
        return this.dimensions;
    }

    public getTrackingTickInterval(): number {
        return this.trackTickInterval;
    }

    public create(...args: ConstructorParameters<F>): T {
        return new this.factory(this, ...args);
    }

    public toString(): string {
        return this.id.toString();
    }

    public static Builder = class Builder<T extends Entity> {
        private readonly factory: Constructor<T>;
        private trackTickInterval = 3;
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

        public setTrackingTickInterval(interval: number) {
            this.trackTickInterval = interval;
            return this;
        }

        public build(id: string): EntityType<Entity> {
            return new EntityType(Identifier.ofVanilla(id), this.factory, this.dimensions, this.trackTickInterval);
        }
    }
}

