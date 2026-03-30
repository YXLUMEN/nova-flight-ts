import {Entity} from "../entity/Entity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {VisualEffect} from "../effect/VisualEffect.ts";
import type {Schedule, TimerTask} from "../apis/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EVENTS, type IEvents} from "../apis/IEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {AtomicInteger} from "../utils/collection/AtomicInteger.ts";
import type {Payload} from "../network/Payload.ts";
import type {Consumer, Predicate, Supplier} from "../apis/types.ts";
import type {EntityList} from "./entity/EntityList.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Explosion} from "./explosion/Explosion.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExplosionVisual} from "./explosion/ExplosionVisual.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import type {IVec} from "../utils/math/IVec.ts";
import type {ClientWorld} from "../client/ClientWorld.ts";
import {EntityType} from "../entity/EntityType.ts";
import type {Channel} from "../network/Channel.ts";
import type {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import {clamp} from "../utils/math/math.ts";
import {StatusEffectInstance} from "../entity/effect/StatusEffectInstance.ts";
import {StatusEffects} from "../entity/effect/StatusEffects.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import type {EntityLookUp} from "./entity/EntityLookUp.ts";
import {BitBlockMap} from "./map/BitBlockMap.ts";
import {AABB} from "../utils/math/AABB.ts";
import {BlockCollision} from "./collision/BlockCollision.ts";
import {LivingEntity} from "../entity/LivingEntity.ts";
import type {ExplosionBehavior} from "./explosion/ExplosionBehavior.ts";
import {EntityPredicates} from "../predicate/EntityPredicates.ts";

export abstract class World {
    public static readonly WORLD_W = 1760;
    public static readonly WORLD_H = 1120;
    public static readonly BLOCK_SIZE = 8;

    protected readonly blockMap: BitBlockMap = new BitBlockMap(World.WORLD_W, World.WORLD_H);
    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    // ticking
    public readonly isClient: boolean;
    private stageDifficulty = 1;
    public freeze = false;
    protected over = false;

    private readonly registryManager: RegistryManager;
    private readonly damageSources: DamageSources;

    // schedule
    private time = 0;
    private nextTimerId = new AtomicInteger();
    private timers: TimerTask[] = [];

    protected constructor(registryManager: RegistryManager, isClient: boolean) {
        this.isClient = isClient;
        this.registryManager = registryManager;
        this.damageSources = new DamageSources(registryManager);
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

    public getDifficulty(): number {
        return this.stageDifficulty;
    }

    public setDifficulty(difficulty: number) {
        this.stageDifficulty = clamp(difficulty, 0, 16) | 0;
        this.events.emit(EVENTS.DIFFICULT_CHANGE, {difficult: difficulty});
    }

    public getMap() {
        return this.blockMap;
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

    public createExplosion(
        source: Entity | null,
        damageSource: DamageSource | null,
        x: number,
        y: number,
        power: number,
        behaviour: ExplosionBehavior | null = null,
        visual: ExplosionVisual | null = null
    ) {
        const explosion = new Explosion(this, source, damageSource, x, y, power, behaviour, visual);
        explosion.apply();
        return explosion;
    }

    public createEMP(attacker: Entity | null, pos: IVec, radius: number, duration: number = 40, damage: number = 0) {
        const r2 = radius * radius;
        const box = AABB.fromCenter(pos.x, pos.y, radius, radius);

        for (const entity of this.searchOtherEntities(attacker, box, EntityPredicates.inRange(pos, r2))) {
            if (entity instanceof ProjectileEntity) {
                if (entity.getOwner() !== attacker) entity.discard();
                continue;
            }
            if (entity instanceof LivingEntity) {
                entity.addEffect(new StatusEffectInstance(
                    StatusEffects.EMC_STATUS, duration, 1), attacker);
                entity.takeDamage(this.damageSources.arc(attacker), damage);
            }
        }

        this.playSound(attacker, SoundEvents.EMP_BURST);
    }

    public close(): void {
        this.clear();
        this.events.clear();
        Entity.resetCounter();
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

    public abstract getEntityLookup(): EntityLookUp<Entity>;

    public* searchOtherEntities(except: Entity | null, box: AABB, predicate?: Predicate<Entity>) {
        if (!predicate) predicate = EntityPredicates.ANY;
        const search = this.getEntityLookup().search(box);

        for (const entity of search) {
            if (entity !== except && predicate(entity)) {
                yield entity;
            }
        }
    }

    public getOtherEntities(except: Entity | null, box: AABB, predicate: Predicate<Entity>) {
        const candidates: Entity[] = [];
        this.getEntityLookup().forEachInBox(box, entity => {
            if (entity !== except && predicate(entity)) {
                candidates.push(entity);
            }
        });

        return candidates;
    }

    public getFirstOtherEntity(except: Entity | null, box: AABB, predicate?: Predicate<Entity>): Entity | null {
        if (!predicate) predicate = EntityPredicates.ANY;

        let target: Entity | null = null;
        this.getEntityLookup().findFirst(box, entity => {
            if (entity !== except && predicate(entity)) {
                target = entity;
                return true;
            }
            return false;
        });
        return target;
    }

    public getEntityCollisions(entity: Entity | null, box: AABB): Entity[] {
        if (box.getAverageSideLength() < 1E-7) return [];
        const candidates = this.getOtherEntities(entity, box.expandAll(1E-7), entity => !entity.noClip);
        if (candidates.length === 0) return [];
        return candidates;
    }

    public raycast(start: IVec, end: IVec) {
        return BlockCollision.raycastBlock({
            start: start.toImmut(),
            end: end.toImmut(),
            map: this.blockMap
        });
    }

    public abstract gameOver(player: PlayerEntity): void;

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

    public schedule(delaySec: number, fn: Supplier<void>): Schedule {
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
        return this.stageDifficulty === 0;
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