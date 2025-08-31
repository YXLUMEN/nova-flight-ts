import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "./EntityAttribute.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Consumer} from "../../apis/registry.ts";
import type {EntityAttributeModifier} from "./EntityAttributeModifier.ts";


export class EntityAttributeInstance {
    private readonly type: RegistryEntry<EntityAttribute>;
    private readonly updateCallback: Consumer<EntityAttributeInstance>;
    private baseValue: number;
    private value: number = 0;
    private dirty: boolean = true;

    private readonly idToModifiers = new Map<Identifier, EntityAttributeModifier>();

    public constructor(type: RegistryEntry<EntityAttribute>, updateCallback: Consumer<EntityAttributeInstance>) {
        this.type = type;
        this.updateCallback = updateCallback;
        this.baseValue = type.getValue().getDefaultValue();
    }

    public getAttribute() {
        return this.type;
    }

    public getBaseValue() {
        return this.baseValue;
    }

    public setBaseValue(baseValue: number) {
        if (this.baseValue !== baseValue) {
            this.baseValue = baseValue;
            this.onUpdate();
        }
    }

    public getModifiers() {
        const set = new Set<EntityAttributeModifier>(this.idToModifiers.values());
        Object.freeze(set);
        return set;
    }

    public getModifier(id: Identifier) {
        return this.idToModifiers.get(id)!;
    }

    public hasModifier(id: Identifier) {
        return this.idToModifiers.has(id);
    }

    public addModifier(modifier: EntityAttributeModifier) {
        const oldModifier = this.idToModifiers.get(modifier.id);
        if (oldModifier !== undefined) {
            throw new Error('Modifier is already applied on this attribute');
        }

        this.idToModifiers.set(modifier.id, modifier);
        this.onUpdate();
    }

    public updateModifier(modifier: EntityAttributeModifier) {
        const oldModifier = this.idToModifiers.get(modifier.id);
        this.idToModifiers.set(modifier.id, modifier);
        if (oldModifier !== modifier) {
            this.onUpdate();
        }
    }

    public removeModifier(modifier: EntityAttributeModifier) {
        this.removeModifierById(modifier.id);
    }

    public removeModifierById(id: Identifier) {
        const result = this.idToModifiers.delete(id);
        if (!result) return false;
        this.onUpdate();
        return true;
    }

    public clearModifiers() {
        if (this.idToModifiers.size === 0) return;
        this.idToModifiers.clear();
        this.onUpdate();
    }

    public getValue() {
        if (this.dirty) {
            this.value = this.computeValue();
            this.dirty = false;
        }

        return this.value;
    }

    public setFrom(other: EntityAttributeInstance): void {
        this.baseValue = other.baseValue;
        this.idToModifiers.clear();
        other.idToModifiers.entries().forEach(([id, modifier]) => {
            this.idToModifiers.set(id, modifier);
        });
        this.onUpdate();
    }

    private onUpdate() {
        this.dirty = true;
        this.updateCallback(this);
    }

    private computeValue() {
        let value = this.baseValue;
        for (const modifier of this.idToModifiers.values()) {
            value += modifier.value;
        }

        return this.type.getValue().clamp(value);
    }
}