import {World} from "../world/World.ts";
import {type Entity} from "../entity/Entity.ts";
import {ClientEntityManager} from "../world/entity/ClientEntityManager.ts";
import {EntityList} from "../world/entity/EntityList.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import type {EntityHandler} from "../world/entity/EntityHandler.ts";
import type {VisualEffect} from "../effect/VisualEffect.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";
import {NovaFlightClient} from "./NovaFlightClient.ts";
import type {ClientNetworkChannel} from "./network/ClientNetworkChannel.ts";
import {EVENTS} from "../type/IEvents.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {ClientDefaultEvents} from "./ClientDefaultEvents.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExplosionVisual} from "../world/explosion/ExplosionVisual.ts";
import type {Explosion} from "../world/explosion/Explosion.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {Particle} from "../effect/Particle.ts";
import {DEFAULT_CONFIG} from "../configs/WorldConfig.ts";
import {AbstractClientPlayerEntity} from "./entity/AbstractClientPlayerEntity.ts";
import type {NovaFlightServer} from "../server/NovaFlightServer.ts";
import {HistoricalScore} from "../statistics/HistoricalScore.ts";
import type {ExplosionBehavior} from "../world/explosion/ExplosionBehavior.ts";
import type {WorldRender} from "./render/WorldRender.ts";

export class ClientWorld extends World {
    public readonly worldName: string;
    private readonly client: NovaFlightClient = NovaFlightClient.getInstance();
    private readonly worldRender: WorldRender;

    private readonly players = new Set<AbstractClientPlayerEntity>();
    private readonly entities: EntityList = new EntityList();
    private readonly entityManager: ClientEntityManager<Entity>;
    private isMultiPlayer = false;

    public readonly worldSound = new SoundSystem();
    private totalScore = 0;

    public constructor(registryManager: RegistryManager, worldRender: WorldRender, worldName: string) {
        super(registryManager, true);

        this.worldRender = worldRender;
        this.worldName = worldName;
        this.entityManager = new ClientEntityManager(this.ClientEntityHandler);
        this.registerEvents();
    }

    public override tick(dt: number) {
        super.tick(dt);
        this.tickEntities();
    }

    public tickEntities() {
        this.players.forEach(player => {
            if (player.isRemoved()) return;
            this.tickEntity(this.clientTickEntity, player);
        })
        this.entities.forEach(entity => {
            if (entity.isRemoved()) return;
            this.tickEntity(this.clientTickEntity, entity);
        });
        this.entities.processRemovals();
    }

    public override getEntities() {
        return this.entities;
    }

    public override getPlayers() {
        return this.players;
    }

    public override getMobs(): ReadonlySet<MobEntity> {
        return this.entities.getMobs();
    }

    public clientTickEntity(entity: Entity) {
        entity.resetPrevious();
        entity.age++;
        entity.tick();
    }

    public override gameOver() {
        this.over = true;
        this.client.setPause(true);

        const total = this.getTotalScore();
        HistoricalScore.recordScore({
            score: total,
            killEffective: Number((total / this.getTime()).toFixed(2)),
            totalSurvivalTime: Number(this.getTime().toFixed(2)),
            playerName: this.client.playerName,
            worldName: this.worldName,
            version: DEFAULT_CONFIG.version,
            recordTime: Date.now(),
            devMode: this.client.player!.isUsedBeDev(),
        }).catch(console.error);

        this.events.emit(EVENTS.GAME_OVER, null);
        setTimeout(() => {
            this.client.onGameOver();
        }, 6000);
    }

    public override getNetworkChannel(): ClientNetworkChannel {
        return this.client.channel;
    }

    public override getServer(): NovaFlightServer | null {
        return null;
    }

    public override addEntity(entity: Entity): void {
        this.entityManager.addEntity(entity);
    }

    public override removeEntity(entityId: number): void {
        this.getEntityLookup().get(entityId)?.discard();
    }

    public override getEntityById(id: number): Entity | null {
        return this.getEntityLookup().get(id);
    }

    public override getEntityLookup() {
        return this.entityManager.getLookup();
    }

    public override playSound(_: Entity | null, sounds: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playSound(sounds, volume, pitch);
    }

    public override playLoopSound(_: Entity | null, sounds: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.worldSound.playLoopSound(sounds, volume, pitch);
    }

    public override stopLoopSound(_: Entity | null, event: SoundEvent): boolean {
        return this.worldSound.stopLoopSound(event);
    }

    public override addParticleByVec(
        pos: IVec, vel: IVec,
        life: number, size: number,
        colorFrom: string, colorTo: string,
        drag = 0.0, gravity = 0.0
    ): void {
        this.worldRender.addParticle(
            pos, vel,
            life, size,
            colorFrom, colorTo,
            drag, gravity
        );
    }

    public override addParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo: string = colorFrom,
        drag = 0.0, gravity = 0.0
    ) {
        this.worldRender.addParticle(
            new MutVec2(posX, posY), new MutVec2(velX, velY),
            life, size,
            colorFrom, colorTo,
            drag, gravity
        );
    }

    public override addImportantParticle(
        posX: number, posY: number, velX: number, velY: number,
        life: number, size: number,
        colorFrom: string, colorTo: string = colorFrom,
        drag = 0.0, gravity = 0.0
    ) {
        this.addEffect(null, new Particle(
            new MutVec2(posX, posY), new MutVec2(velX, velY),
            life, size,
            colorFrom, colorTo,
            drag, gravity
        ));
    }

    public override addEffect(_: Entity | null, effect: VisualEffect) {
        this.worldRender.addEffect(effect);
    }

    public override createExplosion(
        source: Entity | null,
        damageSource: DamageSource | null,
        x: number,
        y: number,
        power: number,
        behaviour: ExplosionBehavior | null = null,
        visual: ExplosionVisual | null = null
    ): Explosion {
        if (visual && visual.shake > 0) {
            this.client.window.camera.addShake(visual.shake);
        }
        return super.createExplosion(source, damageSource, x, y, power, behaviour, visual);
    }

    private registerEvents() {
        this.events.on(EVENTS.ENTITY_REMOVED, event => {
            this.entityManager.remove(event.entity);
        });

        ClientDefaultEvents.registryEvents(this);
    }

    public setTotalScore(score: number): void {
        this.totalScore = Math.max(score, this.totalScore);
    }

    public getTotalScore(): number {
        return this.totalScore;
    }

    public tickWhenMultiPlayer() {
        return this.isMultiPlayer && !this.over;
    }

    public isTechTreeHidden() {
        return document.getElementById('tech-shell')!.classList.contains('hidden');
    }

    public override clear() {
        super.clear();
        this.players.forEach(player => player.discard());
        this.entities.forEach(entity => entity.discard());
        this.entities.clear();
        this.entityManager.clear();
    }

    public saveAll() {
        this.client.getServerWorker()?.getWorker()?.postMessage({type: 'save_all'});
    }

    public readonly ClientEntityHandler: EntityHandler<Entity> = {
        startTicking: (entity: Entity) => {
            if (entity instanceof AbstractClientPlayerEntity) {
                this.players.add(entity);
                if (this.players.size > 1) this.isMultiPlayer = true;
                return;
            }
            this.entities.add(entity);
        },

        stopTicking: (entity: Entity) => {
            if (entity instanceof AbstractClientPlayerEntity) {
                this.players.delete(entity);
                return;
            }
            this.entities.remove(entity);
        },

        stopTracking: (_entity: Entity) => {
        },

        startTracking: (_entity: Entity) => {
        }
    };
}