import {LivingEntity} from "./LivingEntity.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {World} from "../World.ts";
import {PI2, rand} from "../math/math.ts";
import type {DamageSource} from "./damage/DamageSource.ts";
import {PlayerEntity} from "./PlayerEntity.ts";
import {StatusEffects} from "../status/StatusEffects.ts";
import {StatusEffectInstance} from "../status/StatusEffectInstance.ts";
import {Vec2} from "../math/Vec2.ts";
import {DamageTypes} from "./damage/DamageTypes.ts";
import {WorldConfig} from "../configs/WorldConfig.ts";

export abstract class MobEntity extends LivingEntity {
    protected readonly worth: number;
    protected t = Math.random() * 1000;

    protected constructor(world: World, pos: MutVec2, radius: number, health: number, worth: number) {
        super(world, pos, radius, health);
        this.worth = worth;
    }

    public override tick(dt: number): void {
        super.tick(dt);

        const emc = this.getStatusEffect(StatusEffects.EMCStatus);
        if (emc) dt *= emc.getAmplifier() * 0.1;

        this.t += dt;
        this.pos.y += this.speed * dt;
        this.pos.x += Math.sin(this.t * 3) * 40 * dt;

        if (this.pos.y > World.H + 40) this.discard();
    }

    public override takeDamage(damageSource: DamageSource, damage: number): boolean {
        const result = super.takeDamage(damageSource, damage);
        if (!result) return false;

        const attacker = damageSource.getAttacker();
        if (attacker instanceof PlayerEntity && !damageSource.isOf(DamageTypes.ON_FIRE)) {
            if (attacker.techTree.isUnlocked('incendiary_bullet')) {
                const duration = 3 * WorldConfig.tick;
                if (attacker.techTree.isUnlocked('meltdown')) {
                    const effect = this.getStatusEffect(StatusEffects.BurningStatus);
                    if (effect) {
                        const amplifier = Math.min(10, effect.getAmplifier() + 1);
                        this.addStatusEffect(new StatusEffectInstance(StatusEffects.BurningStatus, duration, amplifier));
                    }
                }
                this.addStatusEffect(new StatusEffectInstance(StatusEffects.BurningStatus, duration, 1));
            }
        }

        this.getWorld().spawnParticle(this.pos, Vec2.ZERO, rand(0.2, 0.6), rand(4, 6),
            "#ffaa33", "#ff5454", 0.6, 80);
        return true;
    }

    public override onDeath(damageSource: DamageSource): void {
        super.onDeath(damageSource);

        const world = this.getWorld();
        world.events.emit('mob-killed', {mob: this, damageSource});

        for (let i = 0; i < 4; i++) {
            const a = rand(0, PI2);
            const speed = rand(80, 180);
            const vel = new MutVec2(Math.cos(a) * speed, Math.sin(a) * speed);

            world.spawnParticle(
                this.pos, vel, rand(0.6, 0.8), rand(4, 6),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public attack(player: PlayerEntity) {
        const world = this.getWorld();
        player.takeDamage(world.getDamageSources().mobAttack(this), 1);
        this.onDeath(world.getDamageSources().playerImpact(player));
    }

    public getWorth(): number {
        return this.worth;
    }
}