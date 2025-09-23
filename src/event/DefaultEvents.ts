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
import type {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import type {Entity} from "../entity/Entity.ts";
import {SpawnMarkerEntity} from "../entity/SpawnMarkerEntity.ts";
import {STAGE2} from "../configs/StageConfig2.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {AudioManager} from "../sound/AudioManager.ts";
import {Audios} from "../sound/Audios.ts";
import {STAGE} from "../configs/StageConfig.ts";


export class DefaultEvents {
    public static registryEvents(world: World) {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.UNLOCK_TECH, (event) => {
            applyTech(world, event.id);
        });

        eventBus.on(EVENTS.MOB_KILLED, event => {
            const damageSource = event.damageSource;
            const player = world.player!;
            const techTree = player.techTree;

            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addPhaseScore(event.mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked('energy_recovery')) {
                const laser = Items.LASER_WEAPON as LaserWeapon;
                const stack = player.weapons.get(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            // TODO
            if (techTree.isUnlocked('emergency_repair')) {
                if (Math.random() <= 0.008) player.setHealth(player.getHealth() + 5);
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
            const player = world.player!;
            const techTree = player.techTree;

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
            const player = world.player!;
            const techTree = player.techTree;
            if (techTree.isUnlocked('ele_oscillation')) {
                world.empBurst = event.duration;
            }
        });

        eventBus.on(EVENTS.STAGE_EXIT, (event) => {
            if (event.name === 'p9') {
                world.setStage(STAGE2);
            }
        });

        eventBus.on(EVENTS.ENTITY_LOCKED, (event) => {
            const missile = event.missile as MissileEntity;
            if (missile.isRemoved() || !missile.getTarget()?.isPlayer()) return;
            const player = world.player!;
            player.lockedMissile.add(missile);
        });

        eventBus.on(EVENTS.ENTITY_UNLOCKED, (event) => {
            const target = event.lastTarget as Entity | null;
            const player = world.player!;

            if (target && target.isPlayer() && player.lockedMissile.size > 0) {
                player.lockedMissile.delete(event.missile);
            }
        });

        eventBus.on(EVENTS.STAGE_ENTER, (event) => {
            if (!localStorage.getItem('guided')) {
                this.guide(event, world.player!);
                return;
            }

            if (event.name === 'P6' || event.name === 'mP3') {
                if (BossEntity.hasBoss) return;
                const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
                boss.setPosition(World.W / 2, 64);

                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.getPositionRef);
                world.spawnEntity(mark);
            }

            world.playSound(SoundEvents.PHASE_CHANGE);
        });
    }

    private static guide(event: any, player: PlayerEntity): void {
        const name: string = event.name as string;
        const world = player.getWorld();
        const notify = world.getNotify();

        if (name === 'g_move') {
            notify.show('w/s/a/d 或 方向键 移动', 8);

            let time = 0;
            const ctrl = new AbortController();
            window.addEventListener('keydown', () => {
                if (player.getVelocityRef.length() > 0) time++;
                if (time > 30) {
                    world.nextPhase();
                    ctrl.abort();
                }
            }, {signal: ctrl.signal});
            return;
        }

        if (name === 'g_fire') {
            notify.show('空格/鼠标左键 开火, 或者按下 T 键持续开火', 8);

            const ctrl = new AbortController();
            window.addEventListener('keydown', event => {
                if (ctrl.signal.aborted) return;
                const code = event.code;
                if (code === 'Space') {
                    world.schedule(1, () => {
                        world.nextPhase();
                    });
                    ctrl.abort();
                }
            }, {signal: ctrl.signal});
            return;
        }

        if (name === 'g_enemy') {
            notify.show('小心, 敌人来袭!', 8);
            return;
        }

        if (name === 'g_tech') {
            notify.show('敌人派出了精英单位', 8);

            world.getEntities().forEach(entity => entity.discard());
            world.schedule(6, () => {
                notify.show('按下 G 打开科技界面, 选择一个升级路径', 4);
                notify.show('我们先从 "炮艇专精" 开始, 并研究至 "钢芯穿甲弹"', 8);
            });
            return;
        }

        if (name === 'g_boss') {
            AudioManager.playAudio(Audios.DELTA_FORCE_MAIN);
            AudioManager.setVolume(1);

            notify.show('敌方出动重型单位, 尽可能解锁科技!', 8);
            world.getEntities().forEach(entity => entity.discard());

            player.addPhaseScore(8192);
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 255), null);
            player.setHealth(player.getMaxHealth());

            const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 4096);
            boss.setPosition(World.W / 2, 64);
            boss.invulnerable = true;

            const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
            mark.setPositionByVec(boss.getPositionRef);
            world.spawnEntity(mark);

            AudioManager.removeListener('guide_audio');
            const ctrl = AudioManager.addListener('guide_audio', 'timeupdate', event => {
                const currentTime = (event.target as HTMLAudioElement).currentTime;
                if (106 - currentTime < 0.01) {
                    notify.show('干得好, 接下来就靠你自己了');
                    boss.onDeath(world.getDamageSources().removed());
                    ctrl!.abort();
                    world.schedule(5, () => {
                        world.reset();
                        world.setStage(STAGE);
                    });
                    localStorage.setItem('guided', 'true');
                }
            });
        }
    }
}