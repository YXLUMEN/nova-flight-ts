import {Entity} from "./Entity.ts";
import type {MutVec2} from "../math/MutVec2.ts";
import type {World} from "../World.ts";
import {clamp} from "../math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {StatusEffect} from "../status/StatusEffect.ts";
import type {StatusEffectInstance} from "../status/StatusEffectInstance.ts";

export abstract class LivingEntity extends Entity {
    private maxHealth: number;
    private health: number;
    private readonly activeStatusEffects = new Map<RegistryEntry<StatusEffect>, StatusEffectInstance>();

    protected constructor(world: World, pos: MutVec2, radius: number, health: number) {
        super(world, pos, radius);

        this.maxHealth = health;
        this.health = health;
    }

    public override tick(dt: number) {
        super.tick(dt);
        this.tickStatusEffects();
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        if (this.isInvulnerableTo(damageSource)) return false;

        this.health = Math.max(0, this.health - damage);
        if (this.health <= 0) this.onDeath(damageSource);
        return true;
    }

    public getMaxHealth(): number {
        return this.maxHealth;
    }

    public setMaxHealth(value: number) {
        this.maxHealth = clamp(value, 0, 256);
    }

    public getHealth() {
        return this.health;
    }

    public setHealth(health: number) {
        this.health = clamp(health, 0, this.maxHealth);
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