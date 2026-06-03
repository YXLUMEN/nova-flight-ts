import {GeneralEventBus} from "../../event/GeneralEventBus.ts";
import {EVENTS, type IEvents} from "../../type/IEvents.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {World} from "../../world/World.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import {STAGE} from "../../configs/StageConfig.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {BaseBossEntity} from "../../entity/mob/BaseBossEntity.ts";
import {SequenceEngine} from "../../world/sequence/SequenceEngine.ts";
import {SequenceBuilder, type SequenceDef} from "../../world/sequence/SequenceBuilder.ts";
import type {SequenceContext} from "../../world/sequence/SequenceContext.ts";
import {config} from "../../utils/uit.ts";
import type {Consumer} from "../../type/types.ts";
import {NotGiveUpS2CPacket} from "../../network/packet/s2c/NotGiveUpS2CPacket.ts";

export class TutorialEvents {
    private readonly server: NovaFlightServer;
    private readonly engine: SequenceEngine;

    private readonly sequences: Record<string, SequenceDef>;

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.engine = new SequenceEngine(server);

        const eventBus = GeneralEventBus.getEventBus();
        const onStageEnter = this.onStageEnter.bind(this);
        const onPlayerDead = this.onPlayerDead.bind(this);
        eventBus.on(EVENTS.STAGE_ENTER, onStageEnter);
        eventBus.on(EVENTS.PLAYER_DEAD, onPlayerDead);

        this.sequences = this.createSequences(eventBus, onStageEnter, onPlayerDead);
    }

    private onStageEnter(event: IEvents['world:stage:enter']) {
        const name = event.name;
        const seq = this.sequences[name];
        if (!seq) return;
        void this.engine.play(seq);
    }

    private onPlayerDead(event: IEvents['entity:player.dead']) {
        const player = event.player;
        const world = player.getWorld();

        player.invulnerable = true;
        event.cancel = true;

        world.sendPacket(NotGiveUpS2CPacket.INSTANCE);
        world.schedule(7, () => {
            world.createEMP(player, player.positionRef, 480, 0);
            player.setHealth(player.getMaxHealth());
            player.invulnerable = false;
        });
    }

    private buildEnemySequence(eventBus: GeneralEventBus<IEvents>): SequenceDef {
        return new SequenceBuilder('tutorial_enemy')
            .wait(1000).say('tutorial.enemy')
            .waitResolve('next_on_kill', ctx => {
                const {promise, resolve} = Promise.withResolvers<void>();

                let killCount = 0;
                const condition = () => {
                    if (++killCount !== 12) return;
                    eventBus.off(EVENTS.MOB_KILLED, condition);
                    resolve();
                    this.nextPhase(ctx);
                }

                eventBus.on(EVENTS.MOB_KILLED, condition);
                ctx.onDispose(() => eventBus.off(EVENTS.MOB_KILLED, condition));
                return promise;
            })
            .build();
    }

    private buildTechSequence(eventBus: GeneralEventBus<IEvents>): SequenceDef {
        return new SequenceBuilder('tutorial_tech')
            .saySequence([
                'tutorial.tech.special',
                'tutorial.tech.bomb',
                'tutorial.tech.quick_release',
                'tutorial.tech.change',
                'tutorial.tech.no_choice'
            ], 4000)
            .wait(3000)
            // 玩家尝试攻击 4s
            .accumulate(
                'wait_fire',
                ctx => !!ctx.getHostPlayer()?.wasFiring,
                4000
            )
            .say('tutorial.tech.armor')
            .wait(3000).say('tutorial.tech.call')
            .wait(3000).say('tutorial.tech.teach')
            .wait(2000)
            // 玩家打开面板
            .waitCondition('open_tech_page', ctx => !!ctx.getHostPlayer()?.watchTechPage)
            .say('tutorial.tech.teach.conflict')
            .saySequence([
                'tutorial.tech.teach.antimatter',
                'tutorial.tech.teach.requires',
                'tutorial.tech.teach.cost'
            ], 4000)
            // 解锁前置科技,简化后续判断流程
            .callback('unlock_tech', ctx => {
                const player = ctx.getHostPlayer();
                if (!player) return;
                const tech = player.getTechs();
                tech.forceUnlock(Techs.GUNBOAT_FOCUS);
                tech.forceUnlock(Techs.HD_BULLET);
                tech.forceUnlock(Techs.AD_LOADING);
            })
            .wait(3000).say('tutorial.tech.teach.switch')
            .wait(3000).say('tutorial.tech.teach.fire')
            .wait(2000)
            // 目标科技解锁则终止
            .callback('unlock_tech', ctx => {
                const condition = (event: IEvents['player:tech:unlock_entry']) => {
                    const techEntry = event.tech;
                    if (techEntry === Techs.ANTIMATTER_WARHEAD) {
                        eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition);
                        this.nextPhase(ctx);
                        return;
                    }
                };

                eventBus.on(EVENTS.UNLOCK_TECH_ENTRY, condition);
                ctx.onDispose(() => eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition));
            })
            // 解锁非目标科技触发对话
            .waitResolve('many_tech', ctx => {
                const {promise, resolve} = Promise.withResolvers<void>();
                const condition = () => {
                    const player = ctx.getHostPlayer();
                    if (!player) return;

                    const count = player.getTechs().unloadedTechCount();
                    if (count < 4) return;
                    eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition);
                    resolve();
                };

                eventBus.on(EVENTS.UNLOCK_TECH_ENTRY, condition);
                ctx.onDispose(() => eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition));
                return promise;
            })
            .say('tutorial.tech.score.intro')
            .wait(3000)
            .say('tutorial.tech.score.reset')
            .wait(3000)
            // 一直解锁错误科技触发彩蛋
            .waitResolve('add_score', ctx => {
                const {promise, resolve} = Promise.withResolvers<void>();
                const condition = (event: IEvents['player:tech:unlock_entry']) => {
                    if (event.tech === Techs.ANTIMATTER_WARHEAD) {
                        eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition);
                        resolve();
                        return;
                    }

                    const player = ctx.getHostPlayer();
                    if (!player) return;

                    const count = player.getTechs().unloadedTechCount();
                    switch (count) {
                        case 5:
                            ctx.say('tutorial.tech.score.first');
                            player.addScore(900);
                            break;
                        case 6:
                            ctx.say('tutorial.tech.score.second');
                            player.addScore(900);
                            break;
                        case 7:
                            ctx.say('tutorial.tech.score.third');
                            player.addScore(900);
                            break;
                        case 8:
                            ctx.say('tutorial.tech.score.fourth');
                            player.addScore(900);
                            break;
                        case 9:
                            ctx.say('tutorial.tech.score.fifth');
                            player.addScore(900);
                            break;
                        case 10:
                            ctx.say('tutorial.tech.score.sixth');
                            const tech = Techs.ANTIMATTER_WARHEAD;
                            player.getTechs().forceUnlock(tech);
                            eventBus.emit(EVENTS.UNLOCK_TECH_ENTRY, {tech});
                            break;
                    }
                };

                eventBus.on(EVENTS.UNLOCK_TECH_ENTRY, condition);
                ctx.onDispose(() => eventBus.off(EVENTS.UNLOCK_TECH_ENTRY, condition));
                return promise;
            })
            .keepCtx()
            .build()
    }

    private buildBossSequence(eventBus: GeneralEventBus<IEvents>): SequenceDef {
        return new SequenceBuilder('tutorial_boss')
            .wait(2000).say('tutorial.boss.intro')
            .wait(2000)
            // 生成
            .callback('spawn_boss', ctx => {
                const world = ctx.server.world!;
                const boss = new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64);
                boss.setPosition(World.MAP_WIDTH / 2, 64);
                const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
                mark.setPositionByVec(boss.positionRef);
                world.spawnEntity(mark);
            })
            .wait(4000).say('tutorial.boss.heavy')
            .wait(3000).say('tutorial.boss.tech')
            .wait(3000).say('tutorial.boss.recommend')
            .wait(3000).say('tutorial.boss.rocket')
            // 击败后清空怪物
            .waitResolve('wait_boss_kill', ctx => {
                const {promise, resolve} = Promise.withResolvers<void>();
                const condition = () => {
                    eventBus.off(EVENTS.BOSS_KILLED, condition);
                    this.server.world!
                        .getEntities()
                        .getMobs()
                        .forEach(entity => entity.kill());
                    resolve();
                    this.nextPhase(ctx);
                };

                eventBus.on(EVENTS.BOSS_KILLED, condition);
                ctx.onDispose(() => eventBus.off(EVENTS.BOSS_KILLED, condition));
                return promise;
            })
            .build();
    }

    private createSequences(
        eventBus: GeneralEventBus<IEvents>,
        onStageEnter: Consumer<IEvents['world:stage:enter']>,
        onPlayerDead: Consumer<IEvents['entity:player.dead']>
    ): Record<string, SequenceDef> {
        return config({
            tutorial_intro: new SequenceBuilder('tutorial_intro')
                .wait(1000).say('tutorial.intro.welcome')
                .wait(3000).say('tutorial.intro.teach')
                .callback('next', this.nextPhase)
                .build(),
            tutorial_move: new SequenceBuilder('tutorial_move')
                .wait(3000).say('tutorial.move')
                .wait(3000)
                .accumulate(
                    'player_moving',
                    ctx => {
                        const p = ctx.getHostPlayer();
                        return !!p && p.velocityRef.lengthSquared() >= 150;
                    },
                    5000
                )
                .callback('next', this.nextPhase)
                .build(),
            tutorial_fire: new SequenceBuilder('tutorial_fire')
                .wait(3000).say('tutorial.fire.space')
                .wait(3000).say('tutorial.fire.ammo')
                .wait(3000)
                .accumulate(
                    'player_firing',
                    ctx => !!ctx.getHostPlayer()?.wasFiring,
                    5000
                )
                .callback('next', this.nextPhase)
                .build(),
            tutorial_enemy: this.buildEnemySequence(eventBus),
            tutorial_tech: this.buildTechSequence(eventBus),
            tutorial_boss: this.buildBossSequence(eventBus),
            tutorial_end: new SequenceBuilder('tutorial_end')
                .wait(2000).say('tutorial.end')
                .wait(3000).say('tutorial.end.exit')
                .wait(2000)
                // 流程结束,重置阶段
                .callback('finalize', ctx => {
                    eventBus.off(EVENTS.STAGE_ENTER, onStageEnter);
                    eventBus.off(EVENTS.PLAYER_DEAD, onPlayerDead);
                    ctx.server.world!.stage = STAGE;
                    ctx.server.world!.stage.setStage('P7');
                })
                .build(),
        });
    }

    private nextPhase(ctx: SequenceContext) {
        ctx.server.world!.stage.nextPhase();
    }
}