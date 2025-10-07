import {DamageTypeTags} from "../registry/tag/DamageTypeTags.ts";
import {LaserWeapon} from "../item/weapon/LaserWeapon.ts";
import {BossEntity} from "../entity/mob/BossEntity.ts";
import {World} from "../world/World.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
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
import {Window} from "../client/render/Window.ts";


export class DefaultEvents {
    public static registryEvents(world: World) {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.MOB_KILLED, event => {
            const damageSource = event.damageSource;
            const player = world.player;
            if (!player) return;

            const techTree = player.techTree;

            if (!damageSource.isIn(DamageTypeTags.NOT_GAIN_SCORE)) {
                player.addPhaseScore(event.mob.getWorth());
            }

            if (damageSource.isIn(DamageTypeTags.REPLY_LASER) && techTree.isUnlocked('energy_recovery')) {
                const laser = Items.LASER_WEAPON as LaserWeapon;
                const stack = player.getItem(laser);
                if (stack && stack.isAvailable()) {
                    laser.setCooldown(stack, laser.getCooldown(stack) - 25);
                }
            }

            // TODO
            if (techTree.isUnlocked('emergency_repair')) {
                if (Math.random() <= 0.08) player.setHealth(player.getHealth() + 5);
            }
        });

        eventBus.on(EVENTS.EMP_BURST, (event) => {
            const player = world.player;
            if (!player) return;
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
            const player = world.player;
            if (!player) return;
            player.lockedMissile.add(missile);
        });

        eventBus.on(EVENTS.ENTITY_UNLOCKED, (event) => {
            const target = event.lastTarget as Entity | null;
            const player = world.player;
            if (!player) return;

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
                boss.setPosition(World.WORLD_W / 2, 64);

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
        const notify = Window.notify;

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
            notify.show('敌人派出了精英单位, 他们拥有高额伤害抗性', 8);

            world.getEntities().forEach(entity => entity.discard());
            world.schedule(6, () => {
                notify.show('按下 G键 打开科技界面, 选择一个升级路径', 8);
                notify.show('我们先从 "炮艇专精" 开始, 并研究至 "钢芯穿甲弹"', 10);
                notify.show('按 R键 或者 鼠标滚轮 切换主武器', 12);
            });
            return;
        }

        if (name === 'g_boss') {
            AudioManager.playAudio(Audios.DELTA_FORCE_MAIN);

            notify.show('敌方出动重型单位, 尽可能解锁科技!', 8);
            world.getEntities().forEach(entity => entity.discard());

            player.addPhaseScore(8192);
            player.addStatusEffect(new StatusEffectInstance(StatusEffects.HEALTH_BOOST, -1, 255), null);
            player.setHealth(player.getMaxHealth());

            const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 4096);
            boss.setPosition(World.WORLD_W / 2, 64);
            boss.invulnerable = true;

            const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
            mark.setPositionByVec(boss.getPositionRef);
            world.spawnEntity(mark);

            AudioManager.removeListener('guide_audio');
            const ctrl = AudioManager.addListener('guide_audio', 'timeupdate', event => {
                const currentTime = (event.target as HTMLAudioElement).currentTime;
                if (106 - currentTime >= 0.01) return;
                notify.show('干得好, 接下来就靠你自己了');
                notify.show('如果需要, 按下 M 键查看教程');
                boss.onDeath(world.getDamageSources().removed());
                ctrl!.abort();
                world.schedule(5, () => {
                    world.reset();
                    world.setStage(STAGE);
                });
                localStorage.setItem('guided', 'true');
            });
        }
    }
}