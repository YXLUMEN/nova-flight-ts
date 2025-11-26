import type {Entity} from "../entity/Entity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {VisualEffect} from "../effect/VisualEffect.ts";
import type {Schedule, TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {type IEvents} from "../apis/IEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {AtomicInteger} from "../utils/math/AtomicInteger.ts";
import type {Payload} from "../network/Payload.ts";
import type {Consumer} from "../apis/types.ts";
import type {EntityList} from "./EntityList.ts";
import type {EntityIndex} from "./EntityIndex.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Explosion} from "./Explosion.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExpendExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {MobEntity} from "../entity/mob/MobEntity.ts";
import type {IVec} from "../utils/math/IVec.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import {EntityType} from "../entity/EntityType.ts";
import type {Channel} from "../network/Channel.ts";
import type {NovaFlightServer} from "../server/NovaFlightServer.ts";

export abstract class World {
    public static readonly WORLD_W = 1692;
    public static readonly WORLD_H = 1030;

    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    // ticking
    public readonly isClient: boolean;
    public stageDifficult = 1;
    public freeze = false;
    protected over = false;
    protected ticking = false;
    private readonly registryManager: RegistryManager;
    private readonly damageSources: DamageSources;

    // schedule
    private time = 0;
    private nextTimerId = new AtomicInteger();
    private timers: TimerTask[] = [];

    protected constructor(
        registryManager: RegistryManager,
        isClient: boolean,
    ) {
        this.isClient = isClient;
        this.registryManager = registryManager;
        this.damageSources = new DamageSources(registryManager);
    }

    public get isTicking(): boolean {
        return this.ticking;
    }

    public get isOver(): boolean {
        return this.over;
    }

    public getIsClient(): this is ClientWorld {
        return this.isClient;
    }

    public getServer(): NovaFlightServer | null {
        return null;
    }

    public abstract playSound(entity: Entity | null, sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract playLoopSound(entity: Entity | null, sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract stopLoopSound(entity: Entity | null, sound: SoundEvent): boolean;

    public abstract addParticleByVec(
        pos: IVec, vel: IVec,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag?: number, gravity?: number
    ): void;

    public abstract addParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo?: string,
        drag?: number, gravity?: number
    ): void;

    public abstract addImportantParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo?: string,
        drag?: number, gravity?: number
    ): void;

    public abstract addEffect(source: Entity | null, effect: VisualEffect): void;

    public createExplosion(entity: Entity | null, damage: DamageSource | null, x: number, y: number, opts: ExpendExplosionOpts) {
        if (!damage) damage = this.getDamageSources().explosion(null, entity);

        const explosion = new Explosion(this, x, y, entity, damage, opts);
        explosion.apply();
        return explosion;
    }

    public close(): void {
        this.clear();
        this.events.clear();
    }

    public clear(): void {
        this.timers.length = 0;
        this.time = 0;
        this.nextTimerId.reset();
    }

    public reset(): void {
        this.clear();
        this.over = false;
    }

    public tick(dt: number): void {
        this.time += dt;
        this.processTimers();
    }

    public tickEntity<T extends Entity>(tickConsumer: Consumer<T>, entity: T) {
        try {
            tickConsumer(entity);
        } catch (err) {
            const type = EntityType.getId(entity.getType())?.toString() ?? 'UnknownType';
            console.error(`Tick Entity with id:${entity.getUUID()} at ${type}`);
            console.error(err);
            throw err;
        }
    }

    public abstract getEntities(): EntityList;

    public abstract getPlayers(): Iterable<PlayerEntity>;

    public abstract getMobs(): ReadonlySet<MobEntity>;

    public abstract addEntity(entity: Entity): void;

    public abstract removeEntity(entityId: number): void;

    public abstract getEntityById(id: number): Entity | null;

    public abstract getEntityLookup(): EntityIndex<Entity>;

    public togglePause(): void {
        if (this.over) return;
        this.setTicking(!this.ticking);
    }

    public gameOver() {
        this.over = true;
        this.schedule(1, () => {
            this.setTicking(false);
        });
    }

    public getDamageSources(): DamageSources {
        return this.damageSources;
    }

    public getRegistryManager(): RegistryManager {
        return this.registryManager;
    }

    public abstract getNetworkChannel(): Channel;

    public sendPacket(payload: Payload) {
        this.getNetworkChannel().send(payload);
    }

    public schedule(delaySec: number, fn: () => void): Schedule {
        const t: TimerTask = {
            id: this.nextTimerId.incrementAndGet(),
            at: this.time + Math.max(0, delaySec),
            fn,
            repeat: false,
            canceled: false
        };
        this.insertTimer(t);
        return {
            id: t.id,
            cancel: () => t.canceled = true
        };
    }

    public scheduleInterval(intervalSec: number, fn: () => void): Schedule {
        const t: TimerTask = {
            id: this.nextTimerId.incrementAndGet(),
            at: this.time + Math.max(0, intervalSec),
            fn,
            repeat: true,
            interval: Math.max(0, intervalSec),
            canceled: false
        };
        this.insertTimer(t);
        return {
            id: t.id,
            cancel: () => t.canceled = true
        };
    }

    public getTime(): number {
        return this.time;
    }

    public isPeaceMode(): boolean {
        return this.stageDifficult === 0;
    }

    public setTicking(ticking = true): void {
        this.ticking = ticking;
    }

    // 二分插入 保持 timers 按 at 升序
    private insertTimer(t: TimerTask) {
        let lo = 0, hi = this.timers.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            if (this.timers[mid].at <= t.at) lo = mid + 1;
            else hi = mid;
        }
        this.timers.splice(lo, 0, t);
    }

    private processTimers() {
        while (this.timers.length && this.timers[0].at <= this.time) {
            const t = this.timers.shift()!;
            if (t.canceled) continue;

            if (!t.repeat) {
                t.fn();
                continue;
            }

            // 重复任务,补齐到当前世界时间; 可能在长时间卡顿时触发多次
            if (t.interval! <= 0) {
                t.fn();
                continue;
            } // 容错
            do {
                t.fn();
                t.at += t.interval!;
            } while (t.at <= this.time && !t.canceled);

            if (!t.canceled) this.insertTimer(t);
        }
    }
}