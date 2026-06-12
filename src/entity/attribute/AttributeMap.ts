import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Attribute} from "./Attribute.ts";
import type {AttributeInstance} from "./AttributeInstance.ts";
import type {AttributeSupplier} from "./AttributeSupplier.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {Registries} from "../../registry/Registries.ts";
import type {AttributeModifier} from "../../component/type/AttributeModifier.ts";

export class AttributeMap {
    private readonly attributes = new Map<RegistryEntry<Attribute>, AttributeInstance>();

    private readonly tracked = new Set<AttributeInstance>();
    private readonly pendingUpdate = new Set<AttributeInstance>();
    private readonly pendingSync = new Set<AttributeInstance>();

    private readonly supplier: AttributeSupplier;

    public constructor(supplier: AttributeSupplier) {
        this.supplier = supplier;
        this.onAttributeModified = this.onAttributeModified.bind(this);
    }

    private onAttributeModified(instance: AttributeInstance): void {
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

    public getInstance(attribute: RegistryEntry<Attribute>): AttributeInstance | null {
        const instance = this.attributes.get(attribute);
        if (instance) {
            return instance;
        }

        const newInstance = this.supplier.createOverride(this.onAttributeModified, attribute);
        if (newInstance) {
            this.attributes.set(attribute, newInstance);
            return newInstance;
        }
        return null;
    }

    public hasAttribute(attribute: RegistryEntry<Attribute>): boolean {
        return this.attributes.has(attribute) || this.supplier.has(attribute);
    }

    public hasModifier(attribute: RegistryEntry<Attribute>, id: Identifier): boolean {
        const instance = this.attributes.get(attribute);
        return instance !== undefined ? instance.getModifier(id) !== undefined : this.supplier.hasModifier(attribute, id);
    }

    public getValue(attribute: RegistryEntry<Attribute>): number {
        const instance = this.attributes.get(attribute);
        return instance !== undefined ? instance.getValue() : this.supplier.getValue(attribute);
    }

    public getBaseValue(attribute: RegistryEntry<Attribute>): number {
        const instance = this.attributes.get(attribute);
        return instance !== undefined ? instance.getBaseValue() : this.supplier.getBaseValue(attribute);
    }

    public getModifierValue(attribute: RegistryEntry<Attribute>, id: Identifier): number {
        const instance = this.attributes.get(attribute);
        return instance !== undefined ? instance.getModifier(id)!.amount : this.supplier.getModifierValue(attribute, id);
    }

    public addModifiers(modifiersMap: Map<RegistryEntry<Attribute>, AttributeModifier>): void {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.getInstance(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
                instance.addModifier(modifier);
            }
        });
    }

    public removeModifiers(modifiersMap: Map<RegistryEntry<Attribute>, AttributeModifier>): void {
        modifiersMap.forEach((modifier, attribute) => {
            const instance = this.attributes.get(attribute);
            if (instance) {
                instance.removeModifierById(modifier.id);
            }
        });
    }

    public setBaseFrom(other: AttributeMap): void {
        other.attributes.values().forEach(instance => {
            const selfInstance = this.getInstance(instance.getAttribute());
            if (selfInstance === null) return;
            selfInstance.setBaseValue(instance.getBaseValue());
        });
    }

    public toNbt(): NbtCompound[] {
        const nbtList: NbtCompound[] = [];

        for (const entityAttributeInstance of this.attributes.values()) {
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

            const instance = this.getInstance(entry);
            if (!instance) continue;

            instance.readNbt(nbt);
            this.onAttributeModified(instance);
        }
    }
}