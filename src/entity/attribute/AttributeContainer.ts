import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import type {EntityAttributeInstance} from "./EntityAttributeInstance.ts";
import type {DefaultAttributeContainer} from "./DefaultAttributeContainer.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {EntityAttributeModifier} from "./EntityAttributeModifier.ts";
import type {NbtCompound} from "../../nbt/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";

export class AttributeContainer {
    private readonly custom = new Map<RegistryEntry<EntityAttribute>, EntityAttributeInstance>();
    private readonly tracked = new Set<EntityAttributeInstance>();
    private readonly pendingUpdate = new Set<EntityAttributeInstance>();
    private readonly fallback: DefaultAttributeContainer;

    public constructor(defaultAttributes: DefaultAttributeContainer) {
        this.fallback = defaultAttributes;
    }

    public getTracked() {
        return this.tracked;
    }

    public getPendingUpdate() {
        return this.pendingUpdate;
    }

    public getCustomInstance(attribute: RegistryEntry<EntityAttribute>): EntityAttributeInstance | null {
        const instance = this.custom.get(attribute);
        if (instance) {
            return instance;
        }

        const callback = this.updateTrackedStatus.bind(this);
        const newInstance = this.fallback.createOverride(callback, attribute);
        if (newInstance) {
            this.custom.set(attribute, newInstance);
            return newInstance;
        }
        return null;
    }

    public hasAttribute(attribute: RegistryEntry<EntityAttribute>): boolean {
        return this.custom.has(attribute) || this.fallback.has(attribute);
    }

    public getValue(attribute: RegistryEntry<EntityAttribute>): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getValue() : this.fallback.getValue(attribute);
    }

    public getBaseValue(attribute: RegistryEntry<EntityAttribute>): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getBaseValue() : this.fallback.getBaseValue(attribute);
    }

    public getModifierValue(attribute: RegistryEntry<EntityAttribute>, id: Identifier): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getModifier(id).value : this.fallback.getModifierValue(attribute, id);
    }

    public addModifiers(modifiersMap: Map<RegistryEntry<EntityAttribute>, EntityAttributeModifier>) {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.getCustomInstance(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
                instance.addModifier(modifier);
            }
        });
    }

    public removeModifiers(modifiersMap: Map<RegistryEntry<EntityAttribute>, EntityAttributeModifier>) {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.custom.get(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
            }
        });
    }

    private updateTrackedStatus(instance: EntityAttributeInstance): void {
        this.pendingUpdate.add(instance);
        if (instance.getAttribute().getValue().isTracked()) {
            this.tracked.add(instance);
        }
    }

    public toNbt(): NbtCompound[] {
        const nbtList: NbtCompound[] = [];

        for (const entityAttributeInstance of this.custom.values()) {
            nbtList.push(entityAttributeInstance.toNbt());
        }

        return nbtList;
    }

    public readNbt(nbtList: NbtCompound[]): void {
        for (const nbt of nbtList) {
            const id = Identifier.tryParse(nbt.getString('id'));
            if (!id) continue;

            const entry = Registries.ATTRIBUTE.getEntryById(id);
            if (!entry) continue;

            const instance = this.getCustomInstance(entry);
            if (instance) {
                instance.readNbt(nbt);
            }
        }
    }
}