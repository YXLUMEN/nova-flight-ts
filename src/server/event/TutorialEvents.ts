import {GeneralEventBus} from "../../event/GeneralEventBus.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {NovaFlightServer} from "../NovaFlightServer.ts";
import {sleep} from "../../utils/uit.ts";
import type {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {Consumer} from "../../apis/types.ts";
import {WorldConfig} from "../../configs/WorldConfig.ts";
import {BossEntity} from "../../entity/mob/BossEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {World} from "../../world/World.ts";
import {SpawnMarkerEntity} from "../../entity/SpawnMarkerEntity.ts";
import type {MobEntity} from "../../entity/mob/MobEntity.ts";
import type {DamageSource} from "../../entity/damage/DamageSource.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {Audios} from "../../sound/Audios.ts";
import {STAGE} from "../../configs/StageConfig.ts";

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
            server.sendMessage('指挥官 ,欢迎来到 \x1b[32m"Nova Flight"');
            await sleep(2000);
            server.sendMessage('接下来我会重复一遍基础驾驶操作(如果需要重复观看, 请按下 \x1b[32mT\x1b[0m)');
            await sleep(2000);

            this.conditions.clear();
            this.nextPhase();
            return;
        }

        if (name === 'tutorial_move') {
            if (this.conditions.has('move')) return;
            this.conditions.set('move', {
                require: 4,
                acc: 0,
            });
            this.currentPhase = name;

            await sleep(800);
            server.sendMessage('按下 \x1b[32mwasd\x1b[0m 或者 \x1b[32m方向键\x1b[0m 进行移动');
            await sleep(2000);

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

            await sleep(800);
            server.sendMessage('按下 \x1b[32mSpace/空格\x1b[0m 或者 \x1b[32m鼠标左键\x1b[0m 进行基础攻击');
            await sleep(2000);
            server.sendMessage('战斗中请务必注意弹药消耗, 若弹药消耗殆尽, 您需要按下 \x1b[32mR\x1b[0m 进行装填');

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
            server.sendMessage('指挥官, 检测到敌舰靠近, 请下令击毁他们!');
            return;
        }

        if (name === 'tutorial_tech') {
            if (this.conditions.has('tech')) return;
            this.conditions.set('tech', {
                requireFire: 3,
                fireAcc: 0,
                fireAchieve: false,
                requireOpenPage: false,
                requireTech: 'apfs_discarding_sabot',
                currentUnlocked: 0,
                showWarn: false,
                unloaded: false,
                requireKill: 12,
                killAcc: 0,
            });
            this.currentPhase = name;

            await sleep(800);
            server.sendMessage('您应该注意到了, 船体完整度下方存在其他信息, 那是舰船的特殊攻击');
            await sleep(2000);
            server.sendMessage('按照排列顺序, 按下 \x1b[32m数字键1\x1b[0m 将会释放 \x1b[32m"炸弹"\x1b[0m');
            await sleep(2000);
            server.sendMessage('您还可以通过按下 \x1b[32m鼠标右键\x1b[0m 快速释放被黄色框选的特殊攻击');
            await sleep(2000);
            server.sendMessage('如果您需要修改\x1b[32m快速释放\x1b[0m的目标, 按下 \x1b[32m鼠标中键\x1b[0m 即可');
            await sleep(2000);
            server.sendMessage('当然, 我们目前并没有更多的特殊攻击可供选择');
            await sleep(2000);

            this.pendingAchievement = this.tech.bind(this);
            return;
        }

        if (name === 'tutorial_boss') {
            if (this.conditions.has('boss')) return;
            this.conditions.set('boss', {
                require: 115,
                acc: 0
            });
            this.currentPhase = name;

            await sleep(500);
            server.sendMessage('指挥官, 请务必小心, 探测到强烈的空间波动, 有大家伙来了');
            await sleep(1000);

            const world = server.world!;
            const boss = new BossEntity(EntityTypes.BOSS_ENTITY, world, 64);
            boss.setPosition(World.WORLD_W / 2, 64);
            boss.invulnerable = true;

            const mark = new SpawnMarkerEntity(EntityTypes.SPAWN_MARK_ENTITY, world, boss, true);
            mark.setPositionByVec(boss.getPositionRef);
            world.spawnEntity(mark);

            await sleep(4000);
            server.sendMessage('是帝国的重型战列舰!');
            server.networkChannel.send(new PlayAudioS2CPacket(Audios.MAKING_LEGENDS, 0.6));
            world.schedule(105, () => server.world!
                .getEntities()
                .getMobs()
                .forEach(entity => entity.kill())
            );

            await sleep(2000);
            server.sendMessage('我们得合理利用科技, 击败它!');
            await sleep(1000);
            server.sendMessage('比如 "近防炮" 和 "火箭发射器"');
            await sleep(1000);
            server.sendMessage('前着可以拦截子弹和导弹, 但它极快的射速容易过热');
            await sleep(1000);
            server.sendMessage('后者能够发射一连串威力极大的火箭弹, 是对付重型目标的利器!');
        }

        if (name === 'tutorial_end') {
            this.currentPhase = name;
            server.sendMessage('接下来看你的了, 指挥官!');
            await sleep(500);
            this.deregister();

            this.pendingAchievement = null;
            this.conditions.clear();

            await sleep(2000);
            server.world!.stage = STAGE;
            while (true) {
                const name = server.world!.stage.getCurrentName();
                if (name === 'P7' || name === null) break;
                server.world!.stage.nextPhase();
            }
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
        if (bossCondition && event.mob.getType() === EntityTypes.BOSS_ENTITY) {
            this.conditions.delete('boss');
            this.pendingAchievement = null;
            this.nextPhase();
        }
    }

    private static move(dt: number) {
        const condition = this.conditions.get('move');
        if (!condition || !this.hostPlayer) return;

        if (this.hostPlayer.getVelocityRef.lengthSquared() < 1) return;

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
            server.sendMessage('指挥官, 敌舰装备了适应装甲, 我们的攻击难以造成有效伤害');
            await sleep(2000);
            server.sendMessage('是时候呼叫我们的科研部门了');
            await sleep(1000);
            server.sendMessage('按下 \x1b[32mG\x1b[0m 就能够打开我们舰船的研究系统');
            await sleep(2000);
            this.isPending = false;
            return;
        }

        if (!condition.requireOpenPage) {
            if (!this.hostPlayer.watchTechPage) return;

            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            server.sendMessage('我们拥有多种升级的途径, 需要注意的是, 部分分支之间存在冲突, 您需要慎重考虑');
            await sleep(1000);
            server.sendMessage('现在, 我们需要利用 \x1b[32m"钢芯穿甲弹"\x1b[0m 穿透敌人的装甲');
            await sleep(1000);
            server.sendMessage('在获取 \x1b[32m"钢芯穿甲弹"\x1b[0m 前需要研究它的\x1b[33m所有\x1b[0m前置科技');
            await sleep(1000);
            server.sendMessage('请注意, 升级科技需要\x1b[33m消耗材料\x1b[0m, 但只要我们击毁敌舰就能获取材料');
            this.isPending = false;
            condition.requireOpenPage = true;

            const tech = this.hostPlayer.getTechs();
            tech.forceUnlock('gunboat_focus');
            tech.forceUnlock('hd_bullet');
            tech.forceUnlock('ad_loading');
            return;
        }

        if (condition.unloaded) return;
        const tech = this.hostPlayer.getTechs();

        if (tech.isUnlocked(condition.requireTech)) {
            condition.unloaded = true;
            this.pendingAchievement = null;
            return;
        }

        const count = tech.unloadedTechCount();
        if (count >= 4 && !condition.showWarn) {
            this.isPending = true;
            const server = NovaFlightServer.getInstance();
            server.sendMessage('指挥官! 材料是很珍贵的, 您需要合理使用');
            await sleep(1000);
            server.sendMessage('如果您选择了错误的升级, 您可以通过科研界面的重置来回收所有科技, 但您需要注意, 回收会造成一些损耗');
            await sleep(1000);
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
                server.sendMessage('指挥官, 请选择\x1b[32m"钢芯穿甲弹"\x1b[0m升级, 它能够高效的穿透敌人护甲');
                this.hostPlayer.addScore(900);
                break;
            case 6:
                server.sendMessage('指挥官, 当下情景, \x1b[32m"钢芯穿甲弹"\x1b[0m是最佳选择');
                this.hostPlayer.addScore(900);
                break;
            case 7:
                server.sendMessage('指挥官!');
                this.hostPlayer.addScore(900);
                break;
            case 8:
                server.sendMessage('指挥官! 快做出正确的选择!');
                this.hostPlayer.addScore(900);
                break;
            case 9:
                server.sendMessage('指挥官, 我真的批不出经费啦!');
                this.hostPlayer.addScore(900);
                break;
            case 10:
                server.sendMessage('好吧好吧, 随便你了, 我已经向科研部门申请了这个科技, 赶快摧毁这些敌舰!');
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