import type {Entity} from "../entity/Entity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {IEffect} from "../effect/IEffect.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import type {Schedule, TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {type IEvents} from "../apis/IEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {AtomicInteger} from "../utils/math/AtomicInteger.ts";
import type {NetworkChannel} from "../network/NetworkChannel.ts";
import type {Payload} from "../network/Payload.ts";
import type {Consumer} from "../apis/registry.ts";
import type {EntityList} from "./EntityList.ts";
import type {EntityIndex} from "./EntityIndex.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";

export abstract class World {
    public static readonly WORLD_W = 1692;
    public static readonly WORLD_H = 1030;

    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    private readonly registryManager: RegistryManager;

    private readonly damageSources: DamageSources;
    // ticking
    public readonly isClient: boolean;
    protected over = false;
    protected ticking = false;
    public peaceMod = false;
    public freeze = false;
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

    public getServer(): Worker | null {
        return null;
    }

    public abstract playSound(sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract playLoopSound(sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract stopLoopSound(sound: SoundEvent): boolean;

    public abstract spawnParticleByVec(
        pos: MutVec2, vel: MutVec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag?: number, gravity?: number
    ): void;

    public abstract spawnParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag?: number, gravity?: number
    ): void;

    public abstract addEffect(effect: IEffect): void;

    // public createExplosion(entity: Entity | null, x: number, y: number) {
    // }

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
            console.error(`Tick Entity with id:${entity.getUuid()} at ${entity.getPosition()}`);
            throw err;
        }
    }

    public abstract getEntities(): EntityList;

    public abstract getPlayers(): Iterable<PlayerEntity>;

    public abstract addEntity(entity: Entity): void;

    public abstract removeEntity(entityId: number): void;

    public abstract getEntityById(id: number): Entity | null;

    public abstract getEntityLookup(): EntityIndex<Entity>;

    public get isTicking(): boolean {
        return this.ticking;
    }

    public get isOver(): boolean {
        return this.over;
    }

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

    public abstract getNetworkChannel(): NetworkChannel;

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
        return this.peaceMod;
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