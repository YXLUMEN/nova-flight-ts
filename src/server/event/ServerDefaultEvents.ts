import type {ServerWorld} from "../ServerWorld.ts";
import {EVENTS} from "../../type/IEvents.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {World} from "../../world/World.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {GeneralEventBus} from "../../event/GeneralEventBus.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {Items} from "../../item/Items.ts";
import type {PhaseLasers} from "../../item/weapon/PhaseLasers.ts";
import {Techs} from "../../world/tech/Techs.ts";
import type {Explosion} from "../../world/explosion/Explosion.ts";
import {DamageTypes} from "../../entity/damage/DamageTypes.ts";
import {BaseBossEntity} from "../../entity/mob/BaseBossEntity.ts";
import {DifficultChangeS2CPacket} from "../../network/packet/s2c/DifficultChangeS2CPacket.ts";
import {EffectEnum} from "../../world/explosion/ExplosionBehavior.ts";

export class ServerDefaultEvents {
    public static registerEvent(world: ServerWorld) {
        const events = GeneralEventBus.getEventBus();

        events.on(EVENTS.MOB_DAMAGE, event => {
            const mob = event.mob as MobEntity;
            const damageSource = event.damageSource as DamageSource;

            const attacker = damageSource.getAttacker();
            if (!(attacker instanceof PlayerEntity)) return;

            if (!damageSource.isIn(DamageTypeTags.NOT_TRIGGER_EROSION)) {
                const techTree = attacker.getTechs();
                if (!techTree.isUnlocked(Techs.ARMOR_EROSION)) return;

                if (techTree.isUnlocked(Techs.GRAY)) {
                    const effect = mob.getStatusEffect(StatusEffects.EROSION);
                    if (effect) {
                        const amplifier = Math.min(10, effect.getAmplifier() + 1);
                        mob.addEffect(new StatusEffectInstance(StatusEffects.EROSION, 400, amplifier), attacker);
                    }
                }
                mob.addEffect(new StatusEffectInstance(StatusEffects.EROSION, 400, 1), attacker);
            }

            if (damageSource.isOf(DamageTypes.ARC) && attacker.getTechs().isUnlocked(Techs.STATIC_ELECTRICITY)) {
                mob.addEffect(new StatusEffectInstance(StatusEffects.EMC_STATUS, 40, 0), attacker);
            }
        });

        events.on(EVENTS.MOB_KILLED, event => {
            const damageSource = event.damageSource as DamageSource;

            const player = damageSource.getAttacker();
            if (!(player instanceof ServerPlayerEntity)) return;

            const techTree = player.getTechs();
            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addScore(event.mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked(Techs.ENERGY_RECOVERY)) {
                const laser = Items.PHASE_LASERS as PhaseLasers;
                const stack = player.getItem(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            if (techTree.isUnlocked(Techs.EMERGENCY_REPAIR)) {
                if (Math.random() <= 0.15) player.setHealth(player.getHealth() + 5);
            }
        });

        events.on(EVENTS.BOSS_KILLED, event => {
            if (!event.entity) {
                world.stage.nextPhase();
                return;
            }

            world.schedule(360, () => {
                if (BossEntity.hasBoss) return;

                world.stage.reset();
                world.stage.setStage('P6');

                const boss = new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64);
                boss.setPosition(World.WORLD_W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                world.spawnEntity(mark);
            });

            if (world.getDifficulty() > 0) {
                world.setDifficulty(world.getDifficulty() + 1);
                world.getNetworkChannel().send(new DifficultChangeS2CPacket(world.getDifficulty()));
            }

            if (world.stage.getCurrentName() === 'P6') {
                world.stage.nextPhase();
            }
        });

        events.on(EVENTS.EMP_BURST, event => {
            const player = event.entity;
            if (player instanceof ServerPlayerEntity && player.getTechs().isUnlocked(Techs.ELE_OSCILLATION)) {
                world.empBurst = event.duration;
            }
        });

        events.on(EVENTS.STAGE_ENTER, event => {
            if (event.name === 'P6' || event.name === 'mP3') {
                if (BossEntity.hasBoss) return;

                world.schedule(10, () => {
                    const boss = new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64);
                    boss.setPosition(World.WORLD_W / 2, 64);

                    const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                    mark.setPositionByVec(boss.getPositionRef);
                    world.spawnEntity(mark);
                });
            }

            world.playSound(null, SoundEvents.PHASE_CHANGE);
        });

        events.on(EVENTS.EXPLOSION, ({explosion}) => {
            const exp = explosion as Explosion;
            const effect = exp.getBehaviour().effect;
            exp.getBehaviour().effect = EffectEnum.TRIGGERED;
            if (effect !== EffectEnum.TRIGGERED) {
                this.serialWarhead(world, explosion);
            }
        });
    }

    private static serialWarhead(world: ServerWorld, explosion: Explosion) {
        const damageSource = explosion.getDamageSource();
        const attacker = damageSource.getAttacker();

        if (!attacker || !attacker.isPlayer()) return;
        if (!attacker.getTechs().isUnlocked(Techs.SERIAL_WARHEAD)) return;

        let count = 0;
        const margin = (explosion.getVisual().radius) / 3;
        explosion.getBehaviour().playSound = false;

        const yaw = explosion.getSource()?.getYaw();
        const schedule = world.scheduleInterval(0.1, () => {
            if (count++ >= 2) {
                schedule.cancel();
                return;
            }

            if (yaw === undefined) {
                world.createExplosion(
                    explosion.getSource(),
                    damageSource,
                    explosion.getX(),
                    explosion.getY(),
                    explosion.getPower(),
                    explosion.getBehaviour(),
                    explosion.getVisual()
                );
                return;
            }

            const x = explosion.getX() + Math.cos(yaw) * margin * count;
            const y = explosion.getY() + Math.sin(yaw) * margin * count;
            world.createExplosion(explosion.getSource(), damageSource, x, y, explosion.getPower(), explosion.getBehaviour(), explosion.getVisual());
        });
    }
}
