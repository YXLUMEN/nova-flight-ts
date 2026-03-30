import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import type {AttributeInstance} from "./AttributeInstance.ts";
import type {AttributeSupplier} from "./AttributeSupplier.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";
import type {AttributeModifier} from "../../component/type/AttributeModifier.ts";

export class AttributeContainer {
    private readonly custom = new Map<RegistryEntry<EntityAttribute>, AttributeInstance>();

    private readonly tracked = new Set<AttributeInstance>();
    private readonly pendingUpdate = new Set<AttributeInstance>();
    private readonly pendingSync = new Set<AttributeInstance>();

    private readonly supplier: AttributeSupplier;

    public constructor(supplier: AttributeSupplier) {
        this.supplier = supplier;
    }

    private updateTrackedStatus(instance: AttributeInstance): void {
        this.pendingUpdate.add(instance);
        if (instance.getAttribute().getValue().isTracked()) {
            this.tracked.add(instance);
            this.pendingSync.add(instance);
        }
    }

    public getTracked(): ReadonlySet<AttributeInstance> {
        return this.tracked;
    }

    public getPendingUpdate(): Set<AttributeInstance> {
        return this.pendingUpdate;
    }

    public getPendingSync(): Set<AttributeInstance> {
        return this.pendingSync;
    }

    public getCustomInstance(attribute: RegistryEntry<EntityAttribute>): AttributeInstance | null {
        const instance = this.custom.get(attribute);
        if (instance) {
            return instance;
        }

        const newInstance = this.supplier.createOverride(this.updateTrackedStatus.bind(this), attribute);
        if (newInstance) {
            this.custom.set(attribute, newInstance);
            return newInstance;
        }
        return null;
    }

    public hasAttribute(attribute: RegistryEntry<EntityAttribute>): boolean {
        return this.custom.has(attribute) || this.supplier.has(attribute);
    }

    public getValue(attribute: RegistryEntry<EntityAttribute>): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getValue() : this.supplier.getValue(attribute);
    }

    public getBaseValue(attribute: RegistryEntry<EntityAttribute>): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getBaseValue() : this.supplier.getBaseValue(attribute);
    }

    public getModifierValue(attribute: RegistryEntry<EntityAttribute>, id: Identifier): number {
        const instance = this.custom.get(attribute);
        return instance !== undefined ? instance.getModifier(id)!.value : this.supplier.getModifierValue(attribute, id);
    }

    public addModifiers(modifiersMap: Map<RegistryEntry<EntityAttribute>, AttributeModifier>): void {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.getCustomInstance(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
                instance.addModifier(modifier);
            }
        });
    }

    public removeModifiers(modifiersMap: Map<RegistryEntry<EntityAttribute>, AttributeModifier>): void {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.custom.get(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
            }
        });
    }

    public setBaseFrom(other: AttributeContainer): void {
        other.custom.values().forEach(instance => {
            const selfInstance = this.getCustomInstance(instance.getAttribute());
            if (selfInstance === null) return;
            selfInstance.setBaseValue(instance.getBaseValue());
        });
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