import {Entity} from "../entity/Entity.ts";
import {GeneralEventBus} from "../event/GeneralEventBus.ts";
import type {VisualEffect} from "../effect/VisualEffect.ts";
import type {Schedule} from "../type/ITimer.ts";
import {DamageSources} from "../entity/damage/DamageSources.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {EVENTS, type IEvents} from "../type/IEvents.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import type {Payload} from "../network/Payload.ts";
import type {Consumer, Predicate, Supplier} from "../type/types.ts";
import type {EntityList} from "./entity/EntityList.ts";
import type {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {Explosion} from "./explosion/Explosion.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExplosionVisual} from "./explosion/ExplosionVisual.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
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
import {EntityPredicates} from "./predicate/EntityPredicates.ts";
import {ScheduleTask} from "./ScheduleTask.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export abstract class World {
    public static readonly WORLD_W = 1760;
    public static readonly WORLD_H = 1120;
    public static readonly BLOCK_SIZE = 8;

    protected readonly blockMap: BitBlockMap = new BitBlockMap(World.WORLD_W, World.WORLD_H);
    public readonly events: GeneralEventBus<IEvents> = GeneralEventBus.getEventBus();
    public empBurst: number = 0

    // ticking
    public readonly isClient: boolean;
    private difficultyLevel = 1;
    protected over = false;

    private readonly registryManager: RegistryManager;
    private readonly damageSources: DamageSources;
    private readonly scheduleTask: ScheduleTask;

    protected constructor(registryManager: RegistryManager, isClient: boolean) {
        this.isClient = isClient;
        this.registryManager = registryManager;
        this.scheduleTask = new ScheduleTask();
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
        return this.difficultyLevel;
    }

    public setDifficulty(difficulty: number) {
        this.difficultyLevel = clamp(difficulty, 0, 16) | 0;
        this.events.emit(EVENTS.DIFFICULT_CHANGE, {difficult: difficulty});
    }

    public getMap() {
        return this.blockMap;
    }

    public abstract playSound(entity: Entity | null, sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract playLoopSound(entity: Entity | null, sound: SoundEvent, volume?: number, pitch?: number): void;

    public abstract stopLoopSound(entity: Entity | null, sound: SoundEvent): boolean;

    public abstract addParticleByVec(
        pos: Vec2, vel: Vec2,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag?: number, gravity?: number
    ): void;

    public abstract addParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo?: string,
        drag?: number
    ): void;

    public abstract addImportantParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo?: string,
        drag?: number
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

    public createEMP(attacker: Entity | null, pos: Vec2, radius: number, duration: number = 40, damage: number = 0) {
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
        this.events.emit(EVENTS.GAME_END, null);
        this.events.clear();
        Entity.resetCounter();
    }

    public clear(): void {
        this.scheduleTask.clear();
    }

    public tick(dt: number): void {
        this.scheduleTask.tick(dt);
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

    public raycast(start: Vec2, end: Vec2) {
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
        return this.scheduleTask.schedule(delaySec, fn);
    }

    public scheduleInterval(intervalSec: number, fn: Supplier<void>): Schedule {
        return this.scheduleTask.scheduleInterval(intervalSec, fn);
    }

    public isPeaceMode(): boolean {
        return this.difficultyLevel === 0;
    }

    public getTime(): number {
        return this.scheduleTask.getTime();
    }
}