import {applyTech} from "../tech_tree/apply_tech.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {LaserWeapon} from "../weapon/LaserWeapon.ts";
import {BombWeapon} from "../weapon/BombWeapon.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {World} from "../world/World.ts";
import type {ExpendExplosionOpts} from "../apis/IExplosionOpts.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

export class DefaultEvents {
    public static registryEvents(world: World) {
        const eventBus = world.events;
        const techTree = world.player.techTree;
        const player = world.player;

        eventBus.on('unlock-tech', (event) => {
            const id = (event as any).id as string;
            applyTech(world, id);
        });

        eventBus.on('mob-killed', (event) => {
            const mob = (event as any).mob as MobEntity;
            const damageSource = (event as any).damageSource as DamageSource;

            if (damageSource.isIn(DamageTypeTags.GAIN_SCORE)) {
                player.addPhaseScore(mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked('energy_recovery')) {
                const laser = player.weapons.get('laser');
                if (laser instanceof LaserWeapon) {
                    if (!laser.isOverHeat()) laser.setCooldown(laser.getCooldown() - 0.5);
                }
            }

            // TODO
            if (techTree.isUnlocked('emergency_repair')) {
                if (Math.random() >= 0.92) player.setHealth(player.getHealth() + 1);
            }
        });

        eventBus.on('mob-damaged', (event) => {
            const mob = (event as any).mob as MobEntity;
            const damageSource = (event as any).damageSource as DamageSource;

            const attacker = damageSource.getAttacker();
            if (attacker instanceof PlayerEntity && !damageSource.isOf(DamageTypes.ON_FIRE)) {
                if (!attacker.techTree.isUnlocked('incendiary_bullet')) return;

                if (attacker.techTree.isUnlocked('meltdown')) {
                    const effect = mob.getStatusEffect(StatusEffects.BURNING);
                    if (effect) {
                        const amplifier = Math.min(10, effect.getAmplifier() + 1);
                        mob.addStatusEffect(new StatusEffectInstance(StatusEffects.BURNING, 400, amplifier), null);
                    }
                }
                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.BURNING, 400, 1), null);
            }
        });

        const applyExplosion = (event: ExpendExplosionOpts) => {
            const {pos, shake, flash, explosionRadius = 16, damage = 2} = event;

            BombWeapon.applyBombDamage(world, event.pos, explosionRadius, damage, event.source, event.attacker);
            BombWeapon.spawnExplosionVisual(world, pos, event);
            if (shake) world.camera.addShake(shake, 0.5);
            if (flash) world.addEffect(flash);
        }

        eventBus.on('bomb-detonate', (event) => {
            const opts = event as ExpendExplosionOpts;

            applyExplosion(opts);
            if (techTree.isUnlocked('serial_warhead')) {
                let counts = 0;
                const task = world.scheduleInterval(0.2, () => {
                    opts.pos.y -= (opts.explosionRadius ?? 16 / 2) | 0;
                    applyExplosion(opts);
                    if (counts++ === 1) task.cancel();
                });
            }
        });

        eventBus.on('emp-burst', (event) => {
            if (techTree.isUnlocked('ele_oscillation')) {
                world.empBurst = (event as any).duration as number;
            }
        });

        eventBus.on('stage-enter', (event) => {
            if ((event as any).name === 'P6') {
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPos(World.W / 2, 64);
                world.spawnEntity(boss)
            }
        });
    }
}