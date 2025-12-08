import type {ServerWorld} from "../ServerWorld.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import type {Entity} from "../../entity/Entity.ts";
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
import {DamageTypes} from "../../entity/damage/DamageTypes.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {Items} from "../../item/Items.ts";
import type {LaserWeapon} from "../../item/weapon/LaserWeapon.ts";
import type {ExpendExplosionOpts} from "../../apis/IExplosionOpts.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../../sound/Audios.ts";
import {AudioControlS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";
import {Techs} from "../../tech/Techs.ts";

export class ServerDefaultEvents {
    public static registerEvent(world: ServerWorld) {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.MOB_DAMAGE, event => {
            const mob = event.mob as MobEntity;
            const damageSource = event.damageSource as DamageSource;

            const attacker = damageSource.getAttacker();
            if (attacker instanceof PlayerEntity && !damageSource.isOf(DamageTypes.ON_FIRE)) {
                const techTree = attacker.getTechs();
                if (!techTree.isUnlocked(Techs.INCENDIARY_BULLET)) return;

                if (techTree.isUnlocked(Techs.MELTDOWN)) {
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

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked(Techs.ENERGY_RECOVERY)) {
                const laser = Items.LASER_WEAPON as LaserWeapon;
                const stack = player.getItem(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            if (techTree.isUnlocked(Techs.EMERGENCY_REPAIR)) {
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

                if (Math.random() > 0.8) {
                    world.getNetworkChannel().send(new PlayAudioS2CPacket(Audios.BOSS_PHASE, 0.6));
                }
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPosition(World.WORLD_W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                world.spawnEntity(mark);
            });

            world.stage.nextPhase();
            world.getNetworkChannel().send(new AudioControlS2CPacket(4));
        });

        eventBus.on(EVENTS.EMP_BURST, event => {
            const player = event.entity as Entity;
            if (player instanceof ServerPlayerEntity && player.getTechs().isUnlocked(Techs.ELE_OSCILLATION)) {
                world.empBurst = event.duration;
            }
        });

        eventBus.on(EVENTS.STAGE_ENTER, event => {
            if (event.name === 'P6' || event.name === 'mP3') {
                if (BossEntity.hasBoss) return;
                world.getNetworkChannel().send(new PlayAudioS2CPacket(Audios.BOSS_PHASE, 1));
                world.schedule(10, () => {
                    const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                    boss.setPosition(World.WORLD_W / 2, 64);

                    const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                    mark.setPositionByVec(boss.getPositionRef);
                    world.spawnEntity(mark);
                });
            }

            world.playSound(null, SoundEvents.PHASE_CHANGE);
        });

        eventBus.on(EVENTS.EXPLOSION, (event: explosion) => {
            if (event.opts.behaviour === 'triggered') return;
            event.opts.behaviour = 'triggered';

            if (!event.opts.attacker || !event.opts.attacker.isPlayer()) return;
            if (!event.opts.attacker.getTechs().isUnlocked(Techs.SERIAL_WARHEAD)) return;

            let count = 0;
            const radius = (event.opts.explosionRadius ?? 16) / 2;

            const yaw = event.entity?.getYaw();
            const schedule = world.scheduleInterval(0.1, () => {
                if (count++ >= 2) {
                    schedule.cancel();
                    return;
                }

                if (yaw === undefined) {
                    world.createExplosion(event.entity, event.damage, event.x, event.y, event.opts);
                    return;
                }

                const x = event.x + Math.cos(yaw) * radius * count;
                const y = event.y + Math.sin(yaw) * radius * count;
                world.createExplosion(event.entity, event.damage, x, y, event.opts);
            });
        });
    }
}

type explosion = {
    entity: Entity | null,
    damage: DamageSource | null,
    x: number,
    y: number,
    opts: ExpendExplosionOpts
};