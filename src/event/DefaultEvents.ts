import {applyTech} from "../tech/apply_tech.ts";
import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {LaserWeapon} from "../item/weapon/LaserWeapon.ts";
import {BombWeapon} from "../item/weapon/BombWeapon.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {World} from "../world/World.ts";
import type {ExpendExplosionOpts} from "../apis/IExplosionOpts.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {GeneralEventBus} from "./GeneralEventBus.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {Items} from "../item/items.ts";
import {STAGE2} from "../configs/StageConfig2.ts";
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";


export class DefaultEvents {
    public static registryEvents(world: World) {
        const eventBus = GeneralEventBus.getEventBus();
        const player = world.player;
        if (!player) return;
        const techTree = player.techTree;

        eventBus.on(EVENTS.UNLOCK_TECH, (event) => {
            applyTech(world, event.id);
            if (event.id === 'steering_gear') {
                world.setStage(STAGE2);
            }
        });

        eventBus.on(EVENTS.MOB_KILLED, (event) => {
            const damageSource = event.damageSource;

            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addPhaseScore(event.mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked('energy_recovery')) {
                const laser = Items.LASER_WEAPON as LaserWeapon;
                const stack = player.weapons.get(laser);
                if (stack) {
                    if (!laser.getOverheated(stack)) laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            // TODO
            if (techTree.isUnlocked('emergency_repair')) {
                if (Math.random() >= 0.92) player.setHealth(player.getHealth() + 1);
            }
        });

        eventBus.on(EVENTS.MOB_DAMAGE, (event) => {
            const mob = event.mob;
            const damageSource = event.damageSource;

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
            const {pos, shake, flash} = event;

            BombWeapon.summonExplosion(world, event.pos, event);
            BombWeapon.spawnExplosionVisual(world, pos, event);
            if (shake) world.camera.addShake(shake, 0.5);
            if (flash) world.addEffect(flash);
        }

        eventBus.on(EVENTS.BOMB_DETONATE, (event) => {
            applyExplosion(event);
            if (techTree.isUnlocked('serial_warhead')) {
                let counts = 0;
                const task = world.scheduleInterval(0.2, () => {
                    const yaw = event.source.getYaw();
                    const xOffset = Math.cos(yaw) * (event.explosionRadius ?? 16 / 2) | 0;
                    const yOffset = Math.sin(yaw) * (event.explosionRadius ?? 16 / 2) | 0;
                    event.pos = event.pos.add(xOffset, yOffset);
                    applyExplosion(event);
                    if (counts++ === 1) task.cancel();
                });
            }
        });

        eventBus.on(EVENTS.EMP_BURST, (event) => {
            if (techTree.isUnlocked('ele_oscillation')) {
                world.empBurst = event.duration;
            }
        });

        eventBus.on(EVENTS.STAGE_ENTER, (event) => {
            if (event.name === 'P6' || event.name === 'mP3') {
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPosition(World.W / 2, 64);
                world.spawnEntity(boss);
            }
        });

        eventBus.on(EVENTS.PLAYER_LOCKED, (event) => {
            const missile = event.missile as MissileEntity;
            if (missile.isRemoved()) return;
            player.lockedCount++;
        });

        eventBus.on(EVENTS.PLAYER_UNLOCKED, () => {
            if (player.lockedCount > 0) player.lockedCount--;
        });
    }
}