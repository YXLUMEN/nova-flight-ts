import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/types.ts";
import type {EntityAttributeModifier} from "./EntityAttributeModifier.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import {createClean} from "../../utils/uit.ts";


export class EntityAttributeInstance {
    private readonly type: RegistryEntry<EntityAttribute>;
    private readonly updateCallback: Consumer<EntityAttributeInstance>;
    private baseValue: number;
    private value: number = 0;
    private dirty: boolean = true;

    private readonly idToModifiers = new HashMap<Identifier, EntityAttributeModifier>();

    public constructor(type: RegistryEntry<EntityAttribute>, updateCallback: Consumer<EntityAttributeInstance>) {
        this.type = type;
        this.updateCallback = updateCallback;
        this.baseValue = type.getValue().getDefaultValue();
    }

    public getAttribute(): RegistryEntry<EntityAttribute> {
        return this.type;
    }

    public getBaseValue(): number {
        return this.baseValue;
    }

    public setBaseValue(baseValue: number): void {
        if (this.baseValue !== baseValue) {
            this.baseValue = baseValue;
            this.onUpdate();
        }
    }

    public getModifiers(): ReadonlySet<EntityAttributeModifier> {
        return new Set<EntityAttributeModifier>(this.idToModifiers.values());
    }

    public getModifier(id: Identifier) {
        return this.idToModifiers.get(id)!;
    }

    public hasModifier(id: Identifier): boolean {
        return this.idToModifiers.has(id);
    }

    public addModifier(modifier: EntityAttributeModifier): void {
        const oldModifier = this.idToModifiers.get(modifier.id);
        if (oldModifier !== undefined) {
            throw new Error('Modifier is already applied on this attribute');
        }
        this.idToModifiers.set(modifier.id, modifier);
        this.onUpdate();

    }

    public updateModifier(modifier: EntityAttributeModifier): void {
        const oldModifier = this.idToModifiers.get(modifier.id);
        this.idToModifiers.set(modifier.id, modifier);
        if (oldModifier !== modifier) {
            this.onUpdate();
        }
    }

    public removeModifier(modifier: EntityAttributeModifier): void {
        this.removeModifierById(modifier.id);
    }

    public removeModifierById(id: Identifier): boolean {
        const result = this.idToModifiers.delete(id);
        if (!result) return false;
        this.onUpdate();
        return true;
    }

    public clearModifiers(): void {
        if (this.idToModifiers.size === 0) return;
        this.idToModifiers.clear();
        this.onUpdate();
    }

    public getValue(): number {
        if (this.dirty) {
            this.value = this.computeValue();
            this.dirty = false;
        }
        return this.value;
    }

    private onUpdate(): void {
        this.dirty = true;
        this.updateCallback(this);
    }

    public isDirty(): boolean {
        return this.dirty;
    }

    private computeValue(): number {
        let value = this.baseValue;
        for (const modifier of this.idToModifiers.values()) {
            value += modifier.value;
        }
        return this.type.getValue().clamp(value);
    }

    public setFrom(other: EntityAttributeInstance): void {
        this.baseValue = other.baseValue;
        this.idToModifiers.clear();
        other.idToModifiers.entries().forEach(([id, modifier]) => {
            this.idToModifiers.set(id, modifier);
        });
        this.onUpdate();

    }

    public toNbt(): NbtCompound {
        const nbt = new NbtCompound();

        nbt.putString('id', this.type.getRegistryKey().getValue().toString());
        nbt.putDouble('base', this.baseValue);

        if (this.idToModifiers.size > 0) {
            const nbtList = [];
            for (const modifier of this.idToModifiers.values()) {
                const modNbt = new NbtCompound();
                modNbt.putString('id', modifier.id.toString());
                modNbt.putDouble('value', modifier.value);

                nbtList.push(modNbt);
            }

            nbt.putCompoundList('modifiers', nbtList);
        }

        return nbt
    }

    public readNbt(nbt: NbtCompound): void {
        const value = nbt.getDouble('base');
        if (!Number.isFinite(value)) throw new Error(`Error when read NBT for EntityAttribute: ${value}`);
        this.baseValue = value;

        const nbtList = nbt.getCompoundList('modifiers');
        if (nbtList) {
            for (const modifierNbt of nbtList) {
                const id = Identifier.tryParse(modifierNbt.getString('id'));
                if (!id) continue;
                const value = modifierNbt.getDouble('value');

                const modifier: EntityAttributeModifier = createClean({id, value});
                this.idToModifiers.set(id, modifier);
            }
        }

        this.onUpdate();
    }
}