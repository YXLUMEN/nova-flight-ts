import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Attribute} from "./Attribute.ts";
import type {Consumer} from "../../type/types.ts";
import type {HashMap} from "../../utils/collection/HashMap.ts";
import type {Codec} from "../../serialization/Codec.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import {isDev} from "../../configs/RuntimeConfig.ts";
import {Log} from "../../worker/log.ts";
import {AttributeModifier, Operation} from "../../component/type/AttributeModifier.ts";
import {WrapperMap} from "../../utils/collection/WrapperMap.ts";
import {IllegalStateError} from "../../type/errors.ts";
import {Codecs} from "../../serialization/Codecs.ts";
import {Registries} from "../../registry/Registries.ts";

export class AttributeInstance {
    public static readonly CODEC: Codec<PackedAttr> = Codecs.group<PackedAttr>(
        Codecs.field('id', Codecs.registry(Registries.ATTRIBUTE)).for(val => val.attribute),
        Codecs.field('base', Codecs.DOUBLE).for(val => val.baseValue),
        Codecs.field('modifiers', Codecs.listOf(AttributeModifier.CODEC)).for(val => val.modifiers)
    ).apply(AttributeInstance.pack);

    public static readonly LIST_CODEC: Codec<PackedAttr[]> = Codecs.listOf(this.CODEC);

    private readonly attribute: RegistryEntry<Attribute>;
    private baseValue: number;
    private value: number = 0;

    private dirty: boolean = true;
    private readonly onDirty: Consumer<AttributeInstance>;
    private readonly modifierById: HashMap<Identifier, AttributeModifier> = new WrapperMap();

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
        const previous = this.modifierById.has(modifier.id);
        if (previous) {
            if (isDev) throw new Error('Modifier is already applied on this attribute');
            else Log.error('Modifier is already applied on this attribute');
            return;
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
        if (Number.isNaN(value)) throw new IllegalStateError('Attribute got NaN');
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

    public pack(): PackedAttr {
        return AttributeInstance.pack(
            this.attribute,
            this.baseValue,
            this.modifierById.values().toArray()
        );
    }

    public apply(packed: PackedAttr): void {
        this.baseValue = packed.baseValue;
        for (const modifier of packed.modifiers) {
            this.modifierById.set(modifier.id, modifier);
        }
        this.setDirty();
    }

    public toString(): string {
        return `[AttrInstance] ${this.attribute}:${this.baseValue}`;
    }

    public static pack(attribute: RegistryEntry<Attribute>, baseValue: number, modifiers: AttributeModifier[]): PackedAttr {
        if (!Number.isFinite(baseValue)) throw new Error(`Error when read NBT for EntityAttribute: ${baseValue}`);
        return {attribute, baseValue, modifiers};
    }
}

export interface PackedAttr {
    readonly attribute: RegistryEntry<Attribute>,
    readonly baseValue: number,
    readonly modifiers: AttributeModifier[],
}