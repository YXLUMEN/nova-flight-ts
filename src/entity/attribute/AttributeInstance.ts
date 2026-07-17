import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Attribute} from "./Attribute.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../type/types.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import {AttributeModifier, Operation} from "../../component/type/AttributeModifier.ts";


export class AttributeInstance {
    private readonly attribute: RegistryEntry<Attribute>;

    private baseValue: number;
    private value: number = 0;

    private dirty: boolean = true;
    private readonly onDirty: Consumer<AttributeInstance>;

    private readonly modifierById = new HashMap<Identifier, AttributeModifier>(8);

    public constructor(type: RegistryEntry<Attribute>, onDirty: Consumer<AttributeInstance>) {
        this.attribute = type;
        this.onDirty = onDirty;
        this.baseValue = type.getValue().getDefaultValue();
    }

    public getAttribute(): RegistryEntry<Attribute> {
        return this.attribute;
    }

    public getBaseValue(): number {
        return this.baseValue;
    }

    public setBaseValue(baseValue: number): void {
        if (this.baseValue !== baseValue) {
            this.baseValue = baseValue;
            this.setDirty();
        }
    }

    public getModifiers(): ReadonlySet<AttributeModifier> {
        return new Set<AttributeModifier>(this.modifierById.values());
    }

    public getModifier(id: Identifier) {
        return this.modifierById.get(id);
    }

    public hasModifier(id: Identifier): boolean {
        return this.modifierById.has(id);
    }

    public addModifier(modifier: AttributeModifier): void {
        const previous = this.modifierById.get(modifier.id);
        if (previous !== undefined) {
            throw new Error('Modifier is already applied on this attribute');
        }
        this.modifierById.set(modifier.id, modifier);
        this.setDirty();
    }

    public updateModifier(modifier: AttributeModifier): void {
        const previous = this.modifierById.get(modifier.id);
        this.modifierById.set(modifier.id, modifier);
        if (previous !== modifier) {
            this.setDirty();
        }
    }

    public removeModifier(modifier: AttributeModifier): void {
        this.removeModifierById(modifier.id);
    }

    public removeModifierById(id: Identifier): boolean {
        const result = this.modifierById.delete(id);
        if (!result) return false;
        this.setDirty();
        return true;
    }

    public clearModifiers(): void {
        if (this.modifierById.size === 0) return;
        this.modifierById.clear();
        this.setDirty();
    }

    public getValue(): number {
        if (this.dirty) {
            this.value = this.computeValue();
            this.dirty = false;
        }
        return this.value;
    }

    private setDirty(): void {
        this.dirty = true;
        this.onDirty(this);
    }

    public isDirty(): boolean {
        return this.dirty;
    }

    private computeValue(): number {
        let value = this.baseValue;
        for (const modifier of this.modifierById.values()) {
            if (modifier.operation === Operation.ADD) {
                value += modifier.amount;
            }
        }
        for (const modifier of this.modifierById.values()) {
            if (modifier.operation === Operation.MULTIPLY) {
                value *= modifier.amount;
            }
        }
        return this.attribute.getValue().clamp(value);
    }

    public setFrom(other: AttributeInstance): void {
        this.baseValue = other.baseValue;
        this.modifierById.clear();
        other.modifierById.entries().forEach(([id, modifier]) => {
            this.modifierById.set(id, modifier);
        });
        this.setDirty();

    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();

        nbt.setString('id', this.attribute.getRegistryKey().getValue().toString());
        nbt.setDouble('base', this.baseValue);

        if (this.modifierById.size > 0) {
            const nbtList: NbtCompound[] = [];
            for (const modifier of this.modifierById.values()) {
                const modNbt = AttributeModifier.CODEC.encode(modifier) as NbtCompound;
                nbtList.push(modNbt);
            }

            nbt.setCompoundArray('modifiers', nbtList);
        }

        return nbt;
    }

    public readNbt(nbt: NbtCompound): void {
        const value = nbt.getDouble('base');
        if (!Number.isFinite(value)) throw new Error(`Error when read NBT for EntityAttribute: ${value}`);
        this.baseValue = value;

        const nbtList = nbt.getCompoundArray('modifiers');
        if (nbtList) {
            for (const modifierNbt of nbtList) {
                const modifier = AttributeModifier.CODEC.decode(modifierNbt);
                if (!modifier) continue;

                this.modifierById.set(modifier.id, modifier);
            }
        }

        this.setDirty();
    }
}