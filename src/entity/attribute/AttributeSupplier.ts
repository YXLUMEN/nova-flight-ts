import {AttributeInstance} from "./AttributeInstance.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/types.ts";
import type {EntityType} from "../EntityType.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {DefaultAttributeRegistry} from "./DefaultAttributeRegistry.ts";

export class AttributeSupplier {
    public static Builder = class Builder {
        private readonly instances = new Map<RegistryEntry<EntityAttribute>, AttributeInstance>();
        private unmodifiable: boolean = false;

        public add(attribute: RegistryEntry<EntityAttribute>): Builder {
            this.checkedAdd(attribute);
            return this;
        }

        public addWithBaseValue(attribute: RegistryEntry<EntityAttribute>, baseValue: number): Builder {
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

        private checkedAdd(attribute: RegistryEntry<EntityAttribute>): AttributeInstance {
            const instance = new AttributeInstance(attribute, () => {
                if (this.unmodifiable) {
                    throw new Error(`Tried to change value for default attribute instance: ${attribute.toString()}`);
                }
            });
            this.instances.set(attribute, instance);
            return instance;
        }
    }

    private readonly instances = new Map<RegistryEntry<EntityAttribute>, AttributeInstance>();

    public constructor(instances: Map<RegistryEntry<EntityAttribute>, AttributeInstance>) {
        this.instances = instances;
    }

    public static builder(): InstanceType<typeof AttributeSupplier.Builder> {
        return new AttributeSupplier.Builder();
    }

    public getValue(attribute: RegistryEntry<EntityAttribute>): number {
        return this.require(attribute).getValue();
    }

    public getBaseValue(attribute: RegistryEntry<EntityAttribute>): number {
        return this.require(attribute).getBaseValue();
    }

    public getModifierValue(attribute: RegistryEntry<EntityAttribute>, id: Identifier): number {
        const modifier = this.require(attribute).getModifier(id);
        if (!modifier) {
            throw new ReferenceError(`Can't find modifier ${id} on attribute ${attribute.toString()}`);
        }

        return modifier.value;
    }

    public createOverride(updateCallback: Consumer<AttributeInstance>, attribute: RegistryEntry<EntityAttribute>) {
        const instance = this.instances.get(attribute);
        if (!instance) {
            return null;
        } else {
            const newInstance = new AttributeInstance(attribute, updateCallback);
            newInstance.setFrom(instance);
            return newInstance;
        }
    }

    public has(attribute: RegistryEntry<EntityAttribute>) {
        return this.instances.has(attribute);
    }

    public hasModifier(attribute: RegistryEntry<EntityAttribute>, id: Identifier) {
        const instance = this.instances.get(attribute);
        return instance !== undefined && instance.getModifier(id) !== undefined;
    }

    private require(attribute: RegistryEntry<EntityAttribute>): AttributeInstance {
        const instance = this.instances.get(attribute);
        if (!instance) {
            throw new ReferenceError(`Can't find attribute: ${attribute.toString()}`);
        }
        return instance;
    }
}