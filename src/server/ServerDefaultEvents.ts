import type {ServerWorld} from "./ServerWorld.ts";
import {EVENTS} from "../apis/IEvents.ts";
import type {Entity} from "../entity/Entity.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {World} from "../world/World.ts";
import {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {DamageTypes} from "../entity/damage/DamageTypes.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {Items} from "../item/Items.ts";
import type {LaserWeapon} from "../item/weapon/LaserWeapon.ts";

export class ServerDefaultEvents {
    public static registerEvent(world: ServerWorld) {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.MOB_DAMAGE, event => {
            const mob = event.mob as MobEntity;
            const damageSource = event.damageSource;

            const attacker = damageSource.getAttacker();
            if (attacker instanceof PlayerEntity && !damageSource.isOf(DamageTypes.ON_FIRE)) {
                const techTree = attacker.getTechs();
                if (!techTree.isUnlocked('incendiary_bullet')) return;

                if (techTree.isUnlocked('meltdown')) {
                    const effect = mob.getStatusEffect(StatusEffects.BURNING);
                    if (effect) {
                        const amplifier = Math.min(10, effect.getAmplifier() + 1);
                        mob.addStatusEffect(new StatusEffectInstance(StatusEffects.BURNING, 400, amplifier), attacker);
                    }
                }
                mob.addStatusEffect(new StatusEffectInstance(StatusEffects.BURNING, 400, 1), attacker);
            }
        });

        eventBus.on(EVENTS.MOB_KILLED, event => {
            const damageSource = event.damageSource as DamageSource;

            const player = damageSource.getAttacker();
            if (!(player instanceof ServerPlayerEntity)) return;

            const techTree = player.getTechs();

            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addScore(event.mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked('energy_recovery')) {
                const laser = Items.LASER_WEAPON as LaserWeapon;
                const stack = player.getItem(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            if (techTree.isUnlocked('emergency_repair')) {
                if (Math.random() <= 0.08) player.setHealth(player.getHealth() + 5);
            }
        });

        eventBus.on(EVENTS.BOSS_KILLED, event => {
            if (!event.mob) {
                world.stage.nextPhase();
                return;
            }

            world.schedule(120, () => {
                if (BossEntity.hasBoss) return;

                world.stage.reset();
                while (true) {
                    const name = world.stage.getCurrentName();
                    if (name === 'P6' || name === 'mP3' || name === null) break;
                    world.stage.nextPhase();
                }

                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPosition(World.WORLD_W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                world.spawnEntity(mark);
            });

            world.stage.nextPhase();
        });

        eventBus.on(EVENTS.EMP_BURST, event => {
            const player = event.entity as Entity;
            if (player instanceof ServerPlayerEntity && player.getTechs().isUnlocked('ele_oscillation')) {
                world.empBurst = event.duration;
            }
        });

        eventBus.on(EVENTS.STAGE_ENTER, (event) => {
            if (event.name === 'P6' || event.name === 'mP3') {
                if (BossEntity.hasBoss) return;
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPosition(World.WORLD_W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                world.spawnEntity(mark);
            }

            world.playSound(null, SoundEvents.PHASE_CHANGE);
        });
    }
}