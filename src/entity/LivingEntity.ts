import {Entity} from "./Entity.ts";
import type {World} from "../world/World.ts";
import {clamp} from "../utils/math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {StatusEffectInstance} from "./effect/StatusEffectInstance.ts";
import type {StatusEffect} from "./effect/StatusEffect.ts";
import type {EntityType} from "./EntityType.ts";
import {DataTracker} from "./data/DataTracker.ts";


export abstract class LivingEntity extends Entity {
    private static readonly HEALTH = DataTracker.registerData(Object(LivingEntity), 0);

    private maxHealth: number;
    private readonly activeStatusEffects = new Map<RegistryEntry<StatusEffect>, StatusEffectInstance>();

    protected constructor(type: EntityType<LivingEntity>, world: World, maxHealth: number) {
        super(type, world);
        this.maxHealth = maxHealth;
        this.setHealth(maxHealth);
    }

    public override tick(dt: number) {
        super.tick(dt);
        this.tickStatusEffects();
    }

    protected override initDataTracker(builder: InstanceType<typeof DataTracker.Builder>) {
        builder.add(LivingEntity.HEALTH, 1);
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        this.setHealth(clamp(this.getHealth() - damage, 0, this.maxHealth));
        if (this.getHealth() <= 0) this.onDeath(damageSource);
        return true;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public setMaxHealth(value: number): void {
        this.maxHealth = clamp(value, 0, 256);
    }

    public getHealth(): number {
        return this.dataTracker.get(LivingEntity.HEALTH);
    }

    public setHealth(health: number): void {
        this.dataTracker.set(LivingEntity.HEALTH, clamp(health, 0, this.maxHealth));
    }

    public tickStatusEffects(): void {
        if (this.activeStatusEffects.size === 0) return;

        for (const effect of this.activeStatusEffects.values()) {
            effect.update(this);
        }
    }

    public addStatusEffect(effect: StatusEffectInstance): boolean {
        const type = effect.getEffectType();
        const statusEffect = this.activeStatusEffects.get(type);
        if (statusEffect) {
            return statusEffect.upgrade(effect);
        }
        this.activeStatusEffects.set(type, effect);
        return true;
    }

    public setStatusEffect(effect: StatusEffectInstance): void {
        this.activeStatusEffects.set(effect.getEffectType(), effect);
    }

    public hasStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.has(effect);
    }

    public removeStatusEffect(effect: RegistryEntry<StatusEffect>): boolean {
        return this.activeStatusEffects.delete(effect);
    }

    public getStatusEffect(effect: RegistryEntry<StatusEffect>) {
        return this.activeStatusEffects.get(effect);
    }
}