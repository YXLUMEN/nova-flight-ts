import type {ServerWorld} from "../ServerWorld.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {World} from "../../world/World.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {EventBus} from "../../event/EventBus.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {StatusEffects} from "../../entity/effect/StatusEffects.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {DamageTypeTags} from "../../registry/tag/DamageTypeTags.ts";
import {Items} from "../../item/Items.ts";
import type {PhaseLasers} from "../../item/weapon/PhaseLasers.ts";
import {Techs} from "../../world/tech/Techs.ts";
import type {Explosion} from "../../world/element/explosion/Explosion.ts";
import {DamageTypes} from "../../entity/damage/DamageTypes.ts";
import {BaseBossEntity} from "../../entity/mob/BaseBossEntity.ts";
import {DifficultChangeS2CPacket} from "../../network/packet/s2c/DifficultChangeS2CPacket.ts";
import {ExplosionEffect} from "../../world/element/explosion/ExplosionBehavior.ts";
import {DevourerBoss} from "../../entity/mob/DevourerBoss.ts";
import {ParticleEffects} from "../../effect/ParticleEffects.ts";
import {EntityDamageS2CPacket} from "../../network/packet/s2c/EntityDamageS2CPacket.ts";
import {ScreenShakeS2CPacket} from "../../network/packet/s2c/ScreenShakeS2CPacket.ts";
import {clamp} from "../../utils/math/math.ts";

export class ServerDefaultEvents {
    public static registerEvent() {
        const events = EventBus.instance();

        events.on('entity:mob:damage', ({mob, damageSource}) => {
            const world = mob.getWorld() as ServerWorld;
            if (mob.getShieldAmount() > 0) {
                world.spawnPreparedParticle(ParticleEffects.SHIELD_HIT, mob.positionRef, 2);
                return true;
            }
            world.spawnPreparedParticle(ParticleEffects.HIT, mob.positionRef, 2);

            const attacker = damageSource.getAttacker();
            if (!attacker?.isPlayer()) return;

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

        events.on('entity:mob:killed', ({mob, damageSource}) => {
            const player = damageSource.getAttacker();
            if (!(player instanceof ServerPlayerEntity)) return;

            const techTree = player.getTechs();
            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addScore(mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked(Techs.ENERGY_RECOVERY)) {
                const laser = Items.PHASE_LASERS as PhaseLasers;
                const stack = player.getItem(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                    player.syncStack(stack);
                }
            }

            if (techTree.isUnlocked(Techs.EMERGENCY_REPAIR)) {
                if (Math.random() <= 0.15) player.setHealth(player.getHealth() + 5);
            }
        });

        events.on('entity:boss:killed', event => {
            const world = event.world;

            if (!event.boss) {
                world.stage.nextPhase();
                return;
            }

            world.schedule(360, () => {
                if (BossEntity.hasBoss) return;

                world.stage.reset();
                world.stage.setStage('P6');

                const boss = Math.random() > 0.5 ?
                    new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64) :
                    new DevourerBoss(EntityTypes.DEVOURER_BOSS_ENTITY, world, 96);
                boss.setPosition(World.MAP_WIDTH / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.positionRef);
                world.spawnEntity(mark);
            });

            if (world.getDifficulty() > 0) {
                world.setDifficulty(world.getDifficulty() + 1);
                world.sendPacket(new DifficultChangeS2CPacket(world.getDifficulty()));
            }

            if (world.stage.getCurrentName() === 'P6') {
                world.stage.nextPhase();
            }
        });

        events.on('world:emp_burst', ({entity, duration}) => {
            if (entity instanceof ServerPlayerEntity && entity.getTechs().isUnlocked(Techs.ELE_OSCILLATION)) {
                entity.getWorld().empBurst = duration;
            }
        });

        events.on('world:stage:enter', ({world, name}) => {
            if (name === 'P6') {
                if (BossEntity.hasBoss) return;

                world.schedule(10, () => {
                    const boss = new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64);
                    boss.setPosition(World.MAP_WIDTH / 2, 64);

                    const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                    mark.setPositionByVec(boss.positionRef);
                    world.spawnEntity(mark);
                });
            }

            world.playSound(null, SoundEvents.PHASE_CHANGE);
        });

        events.on('world:explosion', ({world, explosion}) => {
            const effect = explosion.getBehaviour().effect;
            explosion.getBehaviour().effect = ExplosionEffect.TRIGGERED;
            if (effect !== ExplosionEffect.TRIGGERED) {
                this.serialWarhead(world, explosion);
            }
        });

        events.on('entity:player:damage', event => {
            const {player, origin, remain, source} = event;
            const world = player.getWorld();
            const tech = player.getTechs();

            const shake = clamp(origin * 0.3, 0.1, 0.5);
            (player as ServerPlayerEntity).networkHandler.send(new ScreenShakeS2CPacket(shake, 1));

            // 触发emp
            const stack = player.getInventory().searchItem(Items.EMP_WEAPON);
            if (!stack.isEmpty() && tech.isUnlocked(Techs.ELECTRICAL_SURGES)) {
                const emp = Items.EMP_WEAPON;
                const cd = emp.getCooldown(stack);
                emp.tryFire(stack, world, player);
                emp.setCooldown(stack, cd);
            }

            // emp免伤
            if (remain <= 0) return;

            const emp = Items.EMP_WEAPON;
            if (!stack.isEmpty() && emp.canFire(stack) && tech.isUnlocked(Techs.ELE_SHIELD)) {
                emp.tryFire(stack, world, player);

                world.sendPacket(EntityDamageS2CPacket.create(
                    player.getId(),
                    player.positionRef,
                    remain,
                    '#979797'
                ));
                event.cancel();
                return false;
            }

            player.setHealth(player.getHealth() - remain);
            player.setShieldAmount(player.getShieldAmount() - remain);

            for (const effect of player.getStatusEffects()) {
                effect.onEntityDamage(player, source, remain);
            }
            if (player.isDead()) player.onDeath(source);

            world.sendPacket(EntityDamageS2CPacket.create(player.getId(), player.positionRef, remain));
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
