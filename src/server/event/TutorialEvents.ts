import {GeneralEventBus} from "../../event/GeneralEventBus.ts";
import {EVENTS} from "../../type/IEvents.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {sleep} from "../../utils/uit.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {Consumer} from "../../type/types.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {World} from "../../world/World.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {STAGE} from "../../configs/StageConfig.ts";
import {Techs} from "../../world/tech/Techs.ts";
import {BaseBossEntity} from "../../entity/mob/BaseBossEntity.ts";

export class TutorialEvents {
    private static loop: number | undefined = undefined;
    private static hostPlayer: ServerPlayerEntity | null = null;

    private static readonly conditions = new Map<string, any>();
    private static pendingAchievement: Consumer<number> | null = null;
    private static currentPhase: string = '';
    private static isPending = false;

    public static register() {
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.on(EVENTS.STAGE_ENTER, this.bindOnStageEnter);
        eventBus.on(EVENTS.MOB_KILLED, this.bindOnMobKill);

        clearInterval(this.loop);
        this.loop = setInterval(() => this.tick(WorldConfig.mbps), WorldConfig.mbps);
    }

    private static tick(dt: number) {
        if (!this.hostPlayer) {
            const server = NovaFlightServer.getInstance();
            this.hostPlayer = server.playerManager.getAllPlayers()
                .find(player => server.isHost(player.getProfile())) ?? null;
        }

        if (this.isPending) return;
        this.pendingAchievement?.(dt);
    }

    private static bindOnStageEnter = this.onStageEnter.bind(this);
    private static bindOnMobKill = this.onMobKill.bind(this);

    private static async onStageEnter(event: { name: string }) {
        const server = NovaFlightServer.getInstance();
        const name = event.name;
        if (this.currentPhase !== name) {
            this.conditions.clear();
            this.pendingAchievement = null;
        }

        if (name === 'tutorial_intro') {
            if (this.conditions.has('intro')) return;
            this.conditions.set('intro', true);
            this.currentPhase = name;

            await sleep(1000);
            server.sendTranslatable('tutorial.intro.welcome');
            await sleep(3000);
            server.sendTranslatable('tutorial.intro.teach');

            this.conditions.clear();
            this.nextPhase();
            return;
        }

        if (name === 'tutorial_move') {
            if (this.conditions.has('move')) return;
            this.conditions.set('move', {
                require: 6,
                acc: 0,
            });
            this.currentPhase = name;

            await sleep(3000);
            server.sendTranslatable('tutorial.move');
            await sleep(3000);

            this.pendingAchievement = this.move.bind(this);
            return;
        }

        if (name === 'tutorial_fire') {
            if (this.conditions.has('fire')) return;
            this.conditions.set('fire', {
                require: 5,
                acc: 0
            });
            this.currentPhase = name;

            await sleep(3000);
            server.sendTranslatable('tutorial.fire.space');
            await sleep(3000);
            server.sendTranslatable('tutorial.fire.ammo');
            await sleep(3000);

            this.pendingAchievement = this.fire.bind(this);
            return;
        }

        if (name === 'tutorial_enemy') {
            if (this.conditions.has('enemy')) return;
            this.conditions.set('enemy', {
                require: 12,
                acc: 0
            });
            this.currentPhase = name;

            await sleep(1000);
            server.sendTranslatable('tutorial.enemy');
            return;
        }

        if (name === 'tutorial_tech') {
            if (this.conditions.has('tech')) return;
            this.conditions.set('tech', {
                requireFire: 5,
                fireAcc: 0,
                fireAchieve: false,
                requireOpenPage: false,
                requireTech: Techs.ANTIMATTER_WARHEAD,
                currentUnlocked: 0,
                showWarn: false,
                unloaded: false,
                requireKill: 12,
                killAcc: 0,
            });
            this.currentPhase = name;

            await sleep(4000);
            server.sendTranslatable('tutorial.tech.special');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.bomb');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.quick_release');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.change');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.no_choice');
            await sleep(3000);

            this.pendingAchievement = this.tech.bind(this);
            return;
        }

        if (name === 'tutorial_boss') {
            if (this.conditions.has('boss')) return;
            const world = server.world!;

            const cancel = world.schedule(120, () => server.world!
                .getEntities()
                .getMobs()
                .forEach(entity => entity.kill())
            );

            this.conditions.set('boss', {
                require: 125,
                acc: 0,
                cancel,
            });
            this.currentPhase = name;

            await sleep(2000);
            server.sendTranslatable('tutorial.boss.intro');
            await sleep(2000);

            const boss = new BaseBossEntity(EntityTypes.BASE_BOSS_ENTITY, world, 64);
            boss.setPosition(World.WORLD_W / 2, 64);

            const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
            mark.setPositionByVec(boss.getPositionRef);
            world.spawnEntity(mark);

            await sleep(4000);
            server.sendTranslatable('tutorial.boss.heavy');
            await sleep(3000);
            server.sendTranslatable('tutorial.boss.tech');
            await sleep(3000);
            server.sendTranslatable('tutorial.boss.recommend');
            await sleep(3000);
            server.sendTranslatable('tutorial.boss.introduction');
            await sleep(3000);
            server.sendTranslatable('tutorial.boss.rocket');
        }

        if (name === 'tutorial_end') {
            this.currentPhase = name;
            await sleep(2000);
            server.sendTranslatable('tutorial.end');
            await sleep(3000);
            server.sendTranslatable('tutorial.end.exit');
            await sleep(500);
            this.deregister();

            this.pendingAchievement = null;
            this.conditions.clear();

            await sleep(2000);
            server.world!.stage = STAGE;
            server.world!.stage.setStage('P7');
        }
    }

    private static onMobKill(event: { mob: MobEntity; damageSource: DamageSource; pos: IVec }) {
        const enemyCondition = this.conditions.get('enemy');
        if (enemyCondition) {
            enemyCondition.acc++;
            if (enemyCondition.acc >= enemyCondition.require) {
                this.conditions.delete('enemy');
                this.pendingAchievement = null;
                this.nextPhase();
            }
            return;
        }

        const techCondition = this.conditions.get('tech');
        if (techCondition && techCondition.unloaded) {
            techCondition.killAcc++;
            if (techCondition.killAcc >= techCondition.requireKill) {
                this.conditions.delete('tech');
                this.pendingAchievement = null;
                this.nextPhase();
            }
        }

        const bossCondition = this.conditions.get('boss');
        if (bossCondition && event.mob instanceof BossEntity) {
            bossCondition?.cancel();
            this.conditions.delete('boss');
            this.pendingAchievement = null;
            this.nextPhase();
        }
    }

    private static move(dt: number) {
        const condition = this.conditions.get('move');
        if (!condition || !this.hostPlayer) return;

        if (this.hostPlayer.getVelocityRef.lengthSquared() < 150) return;

        condition.acc += dt;
        if (condition.acc > condition.require) {
            this.pendingAchievement = null;
            this.conditions.delete('move');
            this.nextPhase();
        }
    }

    private static fire(dt: number) {
        const condition = this.conditions.get('fire');
        if (!condition || !this.hostPlayer) return;

        if (!this.hostPlayer.wasFiring) return;
        condition.acc += dt;
        if (condition.acc > condition.require) {
            this.pendingAchievement = null;
            this.conditions.delete('fire');
            this.nextPhase();
        }
    }

    private static async tech(dt: number) {
        const condition = this.conditions.get('tech');
        if (!condition || !this.hostPlayer) return;

        if (!condition.fireAchieve) {
            if (!this.hostPlayer.wasFiring) return;
            condition.fireAcc += dt;

            if (condition.fireAcc < condition.requireFire) return;
            condition.fireAchieve = true;

            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            server.sendTranslatable('tutorial.tech.armor');
            await sleep(3000);
            server.sendTranslatable('tutorial.tech.call');
            await sleep(3000);
            server.sendTranslatable('tutorial.tech.teach');
            await sleep(2000);
            this.isPending = false;
            return;
        }

        if (!condition.requireOpenPage) {
            if (!this.hostPlayer.watchTechPage) return;

            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            server.sendTranslatable('tutorial.tech.teach.conflict');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.teach.antimatter');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.teach.requires');
            await sleep(4000);
            server.sendTranslatable('tutorial.tech.teach.cost');
            this.isPending = false;
            condition.requireOpenPage = true;

            const tech = this.hostPlayer.getTechs();
            tech.forceUnlock(Techs.GUNBOAT_FOCUS);
            tech.forceUnlock(Techs.HD_BULLET);
            tech.forceUnlock(Techs.AD_LOADING);
            return;
        }

        if (condition.unloaded) return;
        const tech = this.hostPlayer.getTechs();

        if (tech.isUnlocked(condition.requireTech)) {
            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            await sleep(3000);
            server.sendTranslatable('tutorial.tech.teach.switch');
            await sleep(3000);
            server.sendTranslatable('tutorial.tech.teach.fire');
            await sleep(2000);
            this.isPending = false;

            condition.unloaded = true;
            this.pendingAchievement = null;
            return;
        }

        const count = tech.unloadedTechCount();
        if (count >= 4 && !condition.showWarn) {
            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            server.sendTranslatable('tutorial.tech.score.intro');
            await sleep(3000);
            server.sendTranslatable('tutorial.tech.score.reset');
            await sleep(3000);
            this.hostPlayer.addScore(900);
            condition.showWarn = true;
            this.isPending = false;
            return;
        }

        if (condition.currentUnlocked === count) return;
        condition.currentUnlocked = count;
        const server = NovaFlightServer.getInstance();
        switch (condition.currentUnlocked) {
            case 5:
                server.sendTranslatable('tutorial.tech.score.first');
                this.hostPlayer.addScore(900);
                break;
            case 6:
                server.sendTranslatable('tutorial.tech.score.second');
                this.hostPlayer.addScore(900);
                break;
            case 7:
                server.sendTranslatable('tutorial.tech.score.third');
                this.hostPlayer.addScore(900);
                break;
            case 8:
                server.sendTranslatable('tutorial.tech.score.fourth');
                this.hostPlayer.addScore(900);
                break;
            case 9:
                server.sendTranslatable('tutorial.tech.score.fifth');
                this.hostPlayer.addScore(900);
                break;
            case 10:
                server.sendTranslatable('tutorial.tech.score.sixth');
                tech.forceUnlock(condition.requireTech);
                break;
        }
    }

    private static nextPhase() {
        NovaFlightServer.getInstance().world!.stage.nextPhase();
    }

    public static deregister() {
        clearInterval(this.loop);
        const eventBus = GeneralEventBus.getEventBus();

        eventBus.off(EVENTS.STAGE_ENTER, this.bindOnStageEnter);
        eventBus.off(EVENTS.MOB_KILLED, this.bindOnMobKill);
    }
}