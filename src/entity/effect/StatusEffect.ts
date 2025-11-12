import type {Entity} from "../Entity.ts";
import type {AttributeContainer} from "../attribute/AttributeContainer.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {EntityAttributeModifier} from "../attribute/EntityAttributeModifier.ts";
import {createClean} from "../../utils/uit.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {EntityAttribute} from "../attribute/EntityAttribute.ts";
import type {DamageSource} from "../damage/DamageSource.ts";
import type {LivingEntity} from "../LivingEntity.ts";

// 0 BENEFICIAL; 1 HARMFUL; 2 NEUTRAL;
export type StatusEffectCategory = 0 | 1 | 2;

export class StatusEffect {
    public static EffectAttributeModifierCreator = class EffectAttributeModifierCreator {
        public readonly id: Identifier;
        public readonly baseValue: number;

        public constructor(id: Identifier, baseValue: number) {
            this.id = id;
            this.baseValue = baseValue;
        }

        public createAttributeModifier(amplifier: number): EntityAttributeModifier {
            return createClean({
                id: this.id,
                value: this.baseValue * (amplifier + 1)
            });
        }
    }

    private readonly attributeModifiers = new Map<RegistryEntry<EntityAttribute>, InstanceType<typeof StatusEffect.EffectAttributeModifierCreator>>();
    private readonly category: StatusEffectCategory;
    private readonly color: string;

    public constructor(category: StatusEffectCategory, color: string) {
        this.category = category;
        this.color = color;
    }

    public applyUpdateEffect(_entity: LivingEntity, _amplifier: number): boolean {
        return true;
    };

    public applyInstantEffect(_source: Entity | null, _attacker: Entity | null, target: LivingEntity, amplifier: number, _proximity: number): void {
        this.applyUpdateEffect(target, amplifier);
    }

    public canApplyUpdateEffect(_duration: number, _amplifier: number): boolean {
        return false;
    };

    public onAppliedAt(_entity: LivingEntity, _amplifier: number): void {
    }

    public onEntityRemoval(_entity: LivingEntity, _amplifier: number): void {
    }

    public onEntityDamage(_entity: LivingEntity, _amplifier: number, _source: DamageSource, _amount: number) {
    }

    public isInstant(): boolean {
        return false;
    }

    public onAppliedWithEntity(_entity: LivingEntity, _amount: number): void {
    }

    public addAttributeModifier(attribute: RegistryEntry<EntityAttribute>, id: Identifier, amount: number): StatusEffect {
        this.attributeModifiers.set(attribute, new StatusEffect.EffectAttributeModifierCreator(id, amount));
        return this;
    }

    public onApplied(attributeContainer: AttributeContainer, amplifier: number): void {
        for (const entry of this.attributeModifiers.entries()) {
            const attrInstance = attributeContainer.getCustomInstance(entry[0]);
            if (attrInstance) {
                attrInstance.removeModifierById(entry[1].id);
                attrInstance.addModifier(entry[1].createAttributeModifier(amplifier));
            }
        }
    }

    public onRemoved(attributeContainer: AttributeContainer): void {
        for (const entry of this.attributeModifiers.entries()) {
            const attrInstance = attributeContainer.getCustomInstance(entry[0]);
            if (attrInstance) {
                attrInstance.removeModifierById(entry[1].id);
            }
        }
    }

    public getCategory(): StatusEffectCategory {
        return this.category;
    }

    public getColor(): string {
        return this.color;
    }

    public isBeneficial() {
        return this.category === 0;
    }
}