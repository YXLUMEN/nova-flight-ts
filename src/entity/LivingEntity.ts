import {Entity} from "./Entity.ts";
import type {World} from "../world/World.ts";
import {clamp} from "../utils/math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {StatusEffectInstance} from "./effect/StatusEffectInstance.ts";
import type {StatusEffect} from "./effect/StatusEffect.ts";
import type {EntityType} from "./EntityType.ts";
import {DataTracker} from "./data/DataTracker.ts";
import {AttributeContainer} from "./attribute/AttributeContainer.ts";
import type {EntityAttribute} from "./attribute/EntityAttribute.ts";
import {EntityAttributes} from "./attribute/EntityAttributes.ts";
import type {EntityAttributeInstance} from "./attribute/EntityAttributeInstance.ts";
import {DefaultAttributeContainer} from "./attribute/DefaultAttributeContainer.ts";
import {type NbtCompound} from "../nbt/NbtCompound.ts";
import {PacketCodecs} from "../network/codec/PacketCodecs.ts";
import {createTrackDataHandler} from "./data/TrackedDataHandler.ts";


export abstract class LivingEntity extends Entity {
    private static readonly HEALTH = DataTracker.registerData(Object(LivingEntity), createTrackDataHandler(PacketCodecs.FLOAT));

    private readonly attributes: AttributeContainer;
    private readonly activeStatusEffects = new Map<RegistryEntry<StatusEffect>, StatusEffectInstance>();

    protected constructor(type: EntityType<LivingEntity>, world: World) {
        super(type, world);

        this.attributes = new AttributeContainer(this.createLivingAttributes().build(type));
        this.setHealth(this.getMaxHealth());
    }

    public createLivingAttributes(): InstanceType<typeof DefaultAttributeContainer.Builder> {
        return DefaultAttributeContainer.builder()
            .add(EntityAttributes.GENERIC_MAX_HEALTH)
            .add(EntityAttributes.GENERIC_MOVEMENT_SPEED);
    }

    public override tick() {
        super.tick();
        this.tickStatusEffects();
    }

    public getAttributes() {
        return this.attributes;
    }

    public getAttributeInstance(attribute: RegistryEntry<EntityAttribute>): EntityAttributeInstance | null {
        return this.attributes.getCustomInstance(attribute);
    }

    public getAttributeValue(attribute: RegistryEntry<EntityAttribute>) {
        return this.attributes.getValue(attribute);
    }

    public getAttributeBaseValue(attribute: RegistryEntry<EntityAttribute>) {
        return this.attributes.getBaseValue(attribute);
    }

    public getMaxHealth(): number {
        return this.getAttributeValue(EntityAttributes.GENERIC_MAX_HEALTH);
    }

    public getHealth(): number {
        return this.dataTracker.get(LivingEntity.HEALTH);
    }

    public setHealth(health: number): void {
        this.dataTracker.set(LivingEntity.HEALTH, clamp(health, 0, this.getMaxHealth()));
    }

    public override isAlive() {
        return !this.isRemoved() && this.getHealth() > 0.0;
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        this.setHealth(clamp(this.getHealth() - damage, 0, this.getMaxHealth()));
        if (this.getHealth() <= 0) this.onDeath(damageSource);
        return true;
    }

    public getActiveStatusEffects(): Map<RegistryEntry<StatusEffect>, StatusEffectInstance> {
        return this.activeStatusEffects;
    }

    public hasStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.has(effect);
    }

    public getStatusEffect(effect: RegistryEntry<StatusEffect>): StatusEffectInstance {
        return this.activeStatusEffects.get(effect)!;
    }

    public addStatusEffect(effect: StatusEffectInstance, source: Entity | null): boolean {
        if (!this.canHaveStatusEffect(effect)) return false;

        const type = effect.getEffectType();
        const instance = this.activeStatusEffects.get(type);
        let result = false;

        if (instance === undefined) {
            this.activeStatusEffects.set(type, effect);
            this.onStatusEffectApplied(effect, source);
            result = true;
        } else if (instance.upgrade(effect)) {
            this.onStatusEffectUpgraded(instance, true, source);
            result = true;
        }

        effect.onApplied(this);
        return result;
    }

    public canHaveStatusEffect(_effect: StatusEffectInstance): boolean {
        return true;
    }

    public setStatusEffect(effect: StatusEffectInstance, source: Entity | null): void {
        if (!this.canHaveStatusEffect(effect)) return;
        const instance = this.activeStatusEffects.get(effect.getEffectType());
        if (!instance) {
            this.onStatusEffectApplied(effect, source);
        } else {
            this.onStatusEffectUpgraded(effect, true, source);
        }
    }

    public removeStatusEffectInternal(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.delete(effect);
    }

    public removeStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        if (this.removeStatusEffectInternal(effect)) {
            effect.getValue().onRemoved(this.attributes);
            this.updateAttributes();
            return true;
        }
        return false;
    }

    public onStatusEffectApplied(effect: StatusEffectInstance, _source: Entity | null): void {
        effect.getEffectType().getValue().onApplied(this.attributes, effect.getAmplifier());
    }

    protected tickStatusEffects(): void {
        if (this.activeStatusEffects.size === 0) return;
        const effectKeys = [...this.activeStatusEffects.keys()];

        for (const effect of effectKeys) {
            const instance = this.activeStatusEffects.get(effect)!;
            if (!instance.update(this)) {
                this.onStatusEffectRemoved(instance);
            }
        }
    }

    protected override initDataTracker(builder: InstanceType<typeof DataTracker.Builder>) {
        builder.add(LivingEntity.HEALTH, 1);
    }

    protected onStatusEffectUpgraded(effect: StatusEffectInstance, reapplyEffect: boolean, _source: Entity | null): void {
        if (reapplyEffect) {
            const statusEffect = effect.getEffectType().getValue();
            statusEffect.onRemoved(this.attributes);
            statusEffect.onApplied(this.attributes, effect.getAmplifier());
            this.updateAttributes();
        }
    }

    protected onStatusEffectRemoved(effect: StatusEffectInstance): void {
        effect.getEffectType().getValue().onRemoved(this.attributes);
        this.updateAttributes();
    }

    private updateAttributes(): void {
        const pendingAttr = this.attributes.getPendingUpdate();
        for (const attr of pendingAttr) {
            this.updateAttribute(attr.getAttribute());
        }

        pendingAttr.clear();
    }

    private updateAttribute(attribute: RegistryEntry<EntityAttribute>): void {
        if (attribute.matches(EntityAttributes.GENERIC_MAX_HEALTH)) {
            const maxHealth = this.getMaxHealth();
            if (this.getHealth() > maxHealth) {
                this.setHealth(maxHealth);
            }
        }
    }

    public override writeNBT(nbt: NbtCompound): NbtCompound {
        super.writeNBT(nbt);

        let health = this.getHealth();
        if (Number.isNaN(health)) health = 5;
        nbt.putFloat('Health', health);
        nbt.putCompoundList("attributes", this.getAttributes().toNbt());

        if (this.activeStatusEffects.size > 0) {
            const nbtList: NbtCompound[] = [];
            for (const effect of this.activeStatusEffects.values()) {
                nbtList.push(effect.toNbt());
            }

            nbt.putCompoundList('active_effects', nbtList);
        }

        return nbt
    }

    public readNBT(nbt: NbtCompound) {
        super.readNBT(nbt);

        const attributes = nbt.getCompoundList('attributes');
        if (attributes && attributes.length > 0) {
            this.getAttributes().readNbt(attributes);
        }

        const effects = nbt.getCompoundList('active_effects');
        if (effects && effects.length > 0) {
            for (const effectNbt of effects) {
                const effect = StatusEffectInstance.fromNbt(effectNbt);
                if (!effect) continue;
                this.activeStatusEffects.set(effect.getEffectType(), effect);
            }
        }

        this.setHealth(nbt.getFloat('Health'));
    }
}