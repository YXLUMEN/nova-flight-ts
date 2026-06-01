import {AttributeInstance} from "./AttributeInstance.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Attribute} from "./Attribute.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../type/types.ts";
import type {EntityType} from "../EntityType.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {DefaultAttributeRegistry} from "./DefaultAttributeRegistry.ts";

export class AttributeSupplier {
    public static Builder = class Builder {
        private readonly instances = new Map<RegistryEntry<Attribute>, AttributeInstance>();
        private unmodifiable: boolean = false;

        public add(attribute: RegistryEntry<Attribute>): Builder {
            this.checkedAdd(attribute);
            return this;
        }

        public addWithBaseValue(attribute: RegistryEntry<Attribute>, baseValue: number): Builder {
            const instance = this.checkedAdd(attribute);
            instance.setBaseValue(baseValue);
            return this;
        }

        public build(type: EntityType<LivingEntity>): AttributeSupplier {
            this.unmodifiable = true;
            const attr = DefaultAttributeRegistry.get(type);
            if (attr) return attr;

            const newAttr = new AttributeSupplier(new Map(this.instances));
            DefaultAttributeRegistry.set(type, newAttr);
            return newAttr;
        }

        private checkedAdd(attribute: RegistryEntry<Attribute>): AttributeInstance {
            const instance = new AttributeInstance(attribute, () => {
                if (this.unmodifiable) {
                    throw new Error(`Tried to change value for default attribute instance: ${attribute.toString()}`);
                }
            });
            this.instances.set(attribute, instance);
            return instance;
        }
    }

    private readonly instances = new Map<RegistryEntry<Attribute>, AttributeInstance>();

    public constructor(instances: Map<RegistryEntry<Attribute>, AttributeInstance>) {
        this.instances = instances;
    }

    public static builder(): InstanceType<typeof AttributeSupplier.Builder> {
        return new AttributeSupplier.Builder();
    }

    public getValue(attribute: RegistryEntry<Attribute>): number {
        return this.require(attribute).getValue();
    }

    public getBaseValue(attribute: RegistryEntry<Attribute>): number {
        return this.require(attribute).getBaseValue();
    }

    public getModifierValue(attribute: RegistryEntry<Attribute>, id: Identifier): number {
        const modifier = this.require(attribute).getModifier(id);
        if (!modifier) {
            throw new ReferenceError(`Can't find modifier ${id} on attribute ${attribute.toString()}`);
        }

        return modifier.amount;
    }

    public createOverride(updateCallback: Consumer<AttributeInstance>, attribute: RegistryEntry<Attribute>) {
        const instance = this.instances.get(attribute);
        if (!instance) {
            return null;
        }
        const newInstance = new AttributeInstance(attribute, updateCallback);
        newInstance.setFrom(instance);
        return newInstance;
    }

    public has(attribute: RegistryEntry<Attribute>) {
        return this.instances.has(attribute);
    }

    public hasModifier(attribute: RegistryEntry<Attribute>, id: Identifier) {
        const instance = this.instances.get(attribute);
        return instance !== undefined && instance.getModifier(id) !== undefined;
    }

    private require(attribute: RegistryEntry<Attribute>): AttributeInstance {
        const instance = this.instances.get(attribute);
        if (!instance) {
            throw new ReferenceError(`Can't find attribute: ${attribute.toString()}`);
        }
        return instance;
    }
}

export type AttributeSupplierBuilder = InstanceType<typeof AttributeSupplier.Builder>;