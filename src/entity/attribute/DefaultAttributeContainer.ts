import {EntityAttributeInstance} from "./EntityAttributeInstance.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/registry.ts";

export class DefaultAttributeContainer {
    private readonly instances = new Map<RegistryEntry<EntityAttribute>, EntityAttributeInstance>();

    public constructor(instances: Map<RegistryEntry<EntityAttribute>, EntityAttributeInstance>) {
        this.instances = instances;
    }

    private require(attribute: RegistryEntry<EntityAttribute>): EntityAttributeInstance {
        const instance = this.instances.get(attribute);
        if (!instance) {
            throw new ReferenceError(`Can't find attribute: ${attribute.toString()}`);
        }
        return instance;
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

    public createOverride(updateCallback: Consumer<EntityAttributeInstance>, attribute: RegistryEntry<EntityAttribute>) {
        const instance = this.instances.get(attribute);
        if (!instance) {
            return null;
        } else {
            const newInstance = new EntityAttributeInstance(attribute, updateCallback);
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

    public static builder() {
        return new DefaultAttributeContainer.Builder();
    }

    public static Builder = class Builder {
        private readonly instances = new Map<RegistryEntry<EntityAttribute>, EntityAttributeInstance>();
        private unmodifiable: boolean = false;

        private checkedAdd(attribute: RegistryEntry<EntityAttribute>): EntityAttributeInstance {
            const instance = new EntityAttributeInstance(attribute, () => {
                if (this.unmodifiable) {
                    throw new Error(`Tried to change value for default attribute instance: ${attribute.toString()}`);
                }
            });
            this.instances.set(attribute, instance);
            return instance;
        }

        public add(attribute: RegistryEntry<EntityAttribute>): Builder {
            this.checkedAdd(attribute);
            return this;
        }

        public addWithBaseValue(attribute: RegistryEntry<EntityAttribute>, baseValue: number): Builder {
            const instance = this.checkedAdd(attribute);
            instance.setBaseValue(baseValue);
            return this;
        }

        public build(): DefaultAttributeContainer {
            this.unmodifiable = true;
            return new DefaultAttributeContainer(new Map(this.instances));
        }
    }
}