import type {Entity} from "../Entity.ts";
import type {AttributeMap} from "../attribute/AttributeMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Attribute} from "../attribute/Attribute.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import type {LivingEntity} from "../LivingEntity.ts";
import {PacketCodecs} from "../../network/codec/PacketCodecs.ts";
import {Registries} from "../../registry/Registries.ts";
import {AttributeModifier, Operation} from "../../component/type/AttributeModifier.ts";

export class StatusEffect {
    public static readonly ENTRY_PACKET_CODEC = PacketCodecs.registryEntry(Registries.STATUS_EFFECT);

    private readonly attributeModifiers: Map<RegistryEntry<Attribute>, EffectAttributeModifierCreator> = new Map();
    public readonly category: StatusEffectCategory;
    public readonly color: string;
    public readonly isVisible: boolean;

    public constructor(category: StatusEffectCategory, color: string, isVisible = false) {
        this.category = category;
        this.color = color;
        this.isVisible = isVisible;
    }

    public applyEffectTick(_source: Entity | null, _entity: LivingEntity, _amplifier: number): boolean {
        return true;
    }

    public clientVisual(_entity: LivingEntity) {
    }

    public applyInstantEffect(source: Entity | null, _attacker: Entity | null, target: LivingEntity, amplifier: number, _proximity: number): void {
        this.applyEffectTick(source, target, amplifier);
    }

    public shouldApplyThisTick(_duration: number, _amplifier: number): boolean {
        return false;
    };

    public onAppliedAt(_entity: LivingEntity, _amplifier: number): void {
    }

    public onEffectStarted(_entity: LivingEntity, _amplifier: number): void {
    }

    public onEntityRemoved(_entity: LivingEntity, _amplifier: number): void {
    }

    public onEntityDamage(_entity: LivingEntity, _amplifier: number, _source: DamageSource, _amount: number) {
    }

    public isInstant(): boolean {
        return false;
    }

    public addAttributeModifier(attribute: RegistryEntry<Attribute>, id: Identifier, amount: number): StatusEffect {
        this.attributeModifiers.set(attribute, new EffectAttributeModifierCreator(id, amount));
        return this;
    }

    public addAttributeModifiers(attributeContainer: AttributeMap, amplifier: number): void {
        for (const entry of this.attributeModifiers.entries()) {
            const attrInstance = attributeContainer.getInstance(entry[0]);
            if (attrInstance) {
                attrInstance.removeModifierById(entry[1].id);
                attrInstance.addModifier(entry[1].createAttributeModifier(amplifier));
            }
        }
    }

    public removeAttributeModifiers(attributeContainer: AttributeMap): void {
        for (const entry of this.attributeModifiers.entries()) {
            const attrInstance = attributeContainer.getInstance(entry[0]);
            if (attrInstance) attrInstance.removeModifierById(entry[1].id);
        }
    }

    public isBeneficial() {
        return this.category === 0;
    }
}

class EffectAttributeModifierCreator {
    public readonly id: Identifier;
    public readonly baseValue: number;

    public constructor(id: Identifier, baseValue: number) {
        this.id = id;
        this.baseValue = baseValue;
    }

    public createAttributeModifier(amplifier: number): AttributeModifier {
        return new AttributeModifier(this.id, this.baseValue * (amplifier + 1), Operation.ADD);
    }
}

export const enum StatusEffectCategory {
    BENEFICIAL,
    HARMFUL,
    NEUTRAL,
}