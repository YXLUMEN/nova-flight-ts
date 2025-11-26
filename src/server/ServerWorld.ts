import {World} from "../world/World.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {type NovaFlightServer} from "./NovaFlightServer.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {SoundEventS2CPacket} from "../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../network/packet/s2c/StopSoundS2CPacket.ts";
import {type Entity} from "../entity/Entity.ts";
import {EntityType} from "../entity/EntityType.ts";
import {EntityList} from "../world/EntityList.ts";
import {ServerEntityManager} from "../world/ServerEntityManager.ts";
import type {EntityHandler} from "../world/EntityHandler.ts";
import type {UUID} from "../apis/types.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {collideEntityCircle} from "../utils/math/math.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {Stage} from "../stage/Stage.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {EntityRemoveS2CPacket} from "../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {PlayerEntity} from "../entity/player/PlayerEntity.ts";
import {EntityTrackerEntry} from "./network/EntityTrackerEntry.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExpendExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {Explosion} from "../world/Explosion.ts";
import {ExplosionS2CPacket} from "../network/packet/s2c/ExplosionS2CPacket.ts";
import {ServerDefaultEvents} from "./ServerDefaultEvents.ts";
import type {MutVec2} from "../utils/math/MutVec2.ts";
import {ParticleS2CPacket} from "../network/packet/s2c/ParticleS2CPacket.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {encodeToUnsignedByte} from "../utils/NetUtil.ts";
import {type VisualEffect} from "../effect/VisualEffect.ts";
import {EffectCreateS2CPacket} from "../network/packet/s2c/EffectCreateS2CPacket.ts";
import type {IServerPlayNetwork} from "./network/IServerPlayNetwork.ts";
import {warn} from "@tauri-apps/plugin-log";

export class ServerWorld extends World implements NbtSerializable {
    private readonly server: NovaFlightServer;

    public stage: Stage;
    private phaseScore: number = 0;

    private readonly entities: EntityList = new EntityList();
    private readonly entityManager: ServerEntityManager<Entity>;
    private readonly trackedEntities = new Map<number, EntityTrackerEntry>();
    private finishInit = false;

    public constructor(registryManager: RegistryManager, server: NovaFlightServer) {
        super(registryManager, false);

        this.server = server;
        this.entityManager = new ServerEntityManager(this.ServerEntityHandler);
        this.stage = STAGE;

        this.onEvent();
        this.finishInit = true;
    }

    public override tick(dt: number) {
        super.tick(dt);

        this.stage.tick(this);

        for (const entity of this.entities.values()) {
            if (entity.isRemoved()) continue;
            this.tickEntity(this.bindTickEntity, entity);
            if (this.over) break;
        }
        this.entities.processRemovals();
        for (const entry of this.trackedEntities.values()) {
            entry.tick();
        }
    }

    private bindTickEntity = this.serverTickEntity.bind(this);

    private serverTickEntity(entity: Entity): void {
        entity.resetPosition();
        entity.age++;
        entity.tick();

        if (entity.isPlayer()) return;
        this.getPlayers().forEach(player => {
            this.tickOtherEntity(entity, player);
        });
    }

    public tickOtherEntity(entity: Entity, player: ServerPlayerEntity): void {
        // 敌方碰撞
        if (entity instanceof MobEntity) {
            if (player.invulnerable || !collideEntityCircle(player, entity)) return;
            entity.attack(player);
            return;
        }

        // 弹射物碰撞
        if (entity instanceof ProjectileEntity) {
            const owner = entity.getOwner();
            // 敌方命中
            if (owner instanceof MobEntity) {
                if (player.invulnerable || !collideEntityCircle(player, entity)) return;

                entity.onEntityHit(player);
                return;
            }

            // 玩家近防炮命中
            if (entity instanceof CIWSBulletEntity) {
                for (const projectile of this.getProjectiles()) {
                    if (projectile.getOwner() !== owner && collideEntityCircle(entity, projectile)) {
                        entity.onEntityHit(projectile);
                        projectile.onEntityHit(entity);
                        return;
                    }
                }
            }

            // 玩家命中
            for (const mob of this.getMobs()) {
                if (collideEntityCircle(entity, mob)) {
                    entity.onEntityHit(mob);
                    return;
                }
            }
        }
    }

    public override getNetworkChannel(): IServerPlayNetwork {
        return this.server.networkChannel;
    }

    public override setTicking(ticking: boolean = true) {
        if (this.getServer().isMultiPlayer) return;
        super.setTicking(ticking);
    }

    public spawnEntity(entity: Entity): boolean {
        if (this.isPeaceMode() && entity instanceof MobEntity) {
            return false;
        }
        if (entity.isRemoved()) {
            console.warn(`Tried to add entity ${EntityType.getId(entity.getType())} but it was marked as removed already`);
            return false;
        }

        return this.entityManager.addEntity(entity);
    }

    public spawnPlayer(player: ServerPlayerEntity): void {
        const entity = this.getEntity(player.getUUID());
        if (entity) {
            warn(`Force-added player with duplicate UUID ${player.getUUID()}`).catch();
            entity.discard();
            this.removePlayer(entity as ServerPlayerEntity);
        }

        this.entityManager.addEntity(player);
    }

    public removePlayer(player: ServerPlayerEntity): void {
        player.discard();
    }

    public override addEntity(entity: Entity): void {
        this.entityManager.addEntity(entity);
    }

    public override removeEntity(entityId: number): void {
        const entity = this.getEntityLookup().get(entityId);
        if (entity) {
            entity.discard();
        }
    }

    public override getEntityById(id: number): Entity | null {
        return this.getEntityLookup().get(id);
    }

    public getEntity(uuid: UUID): Entity | null {
        return this.getEntityLookup().getByUUID(uuid);
    }

    public override getEntityLookup() {
        return this.entityManager.getIndex();
    }

    public getEntities(): EntityList {
        return this.entities;
    }

    public getPlayers() {
        return this.server.playerManager.getAllPlayers();
    }

    public getMobs(): ReadonlySet<MobEntity> {
        return this.entities.getMobs();
    }

    public getProjectiles(): ReadonlySet<ProjectileEntity> {
        return this.entities.getProjectiles();
    }

    public getPhase(): number {
        return this.phaseScore;
    }

    public setPhase(phase: number): void {
        this.phaseScore = Math.max(0, phase);
    }

    public addPhase(phase: number): void {
        this.setPhase(this.phaseScore + phase);
    }

    public override getServer(): NovaFlightServer {
        return this.server;
    }

    public override playSound(entity: Entity | null, sound: SoundEvent, volume: number = 1, pitch: number = 1): void {
        if (entity instanceof PlayerEntity) {
            this.getNetworkChannel().sendExclude(new SoundEventS2CPacket(sound, volume, pitch, false), entity.getUUID());
            return;
        }
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, false));
    }

    public override playLoopSound(entity: Entity | null, sound: SoundEvent, volume: number = 1, pitch: number = 1): void {
        if (entity instanceof PlayerEntity) {
            this.getNetworkChannel().sendExclude(new SoundEventS2CPacket(sound, volume, pitch, true), entity.getUUID());
            return;
        }
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, false));
    }

    public override stopLoopSound(_: Entity | null, sounds: SoundEvent): boolean {
        this.getNetworkChannel().send(new StopSoundS2CPacket(sounds));
        return true;
    }

    public override addEffect(): void {
    }

    public spawnEffect(source: Entity | null, effect: VisualEffect): void {
        if (source instanceof PlayerEntity) {
            this.getNetworkChannel().sendExclude(new EffectCreateS2CPacket(effect), source.getUUID());
            return;
        }
        this.getNetworkChannel().send(new EffectCreateS2CPacket(effect));
    }

    public override createExplosion(entity: Entity | null, damage: DamageSource | null, x: number, y: number, opts: ExpendExplosionOpts): Explosion {
        const explosion = super.createExplosion(entity, damage, x, y, opts);

        const shack = encodeToUnsignedByte(opts.shake ?? 0, 1);
        this.getNetworkChannel().send(new ExplosionS2CPacket(x, y, opts.explosionRadius ?? 64, shack));
        return explosion;
    }

    public spawnParticle(
        posX: number, posY: number, offsetX: number, offsetY: number,
        count: number, speed: number, life: number, size: number,
        colorFrom: string, colorTo: string): void {
        this.getNetworkChannel().send(ParticleS2CPacket.create(
            posX, posY, offsetX, offsetY, count, speed, life, size, colorFrom, colorTo
        ));
    }

    public spawnParticleVec(
        pos: MutVec2, offsetX: number, offsetY: number,
        count: number, speed: number, life: number, size: number,
        colorFrom: string, colorTo: string): void {
        this.getNetworkChannel().send(ParticleS2CPacket.create(
            pos.x, pos.y, offsetX, offsetY, count, speed, life, size, colorFrom, colorTo
        ));
    }

    public override addImportantParticle() {
    }

    public override addParticleByVec(): void {
    }

    public override addParticle(): void {
    }

    private onEvent() {
        if (this.finishInit) return;

        this.events.on(EVENTS.ENTITY_REMOVED, event => {
            this.entityManager.remove(event.entity);
        });

        ServerDefaultEvents.registerEvent(this);
    }

    public writeNBT(root: NbtCompound): NbtCompound {
        const entityList: NbtCompound[] = [];
        this.entities.forEach(entity => {
            if (!entity.shouldSave()) return;

            const type = entity.getType();
            if (type === EntityTypes.PLAYER) return;

            const nbt = new NbtCompound();
            const typeId = EntityType.getId(type)!;
            nbt.putString('Type', typeId.toString());
            entity.writeNBT(nbt);
            entityList.push(nbt);
        });
        root.putCompoundList('Entities', entityList);

        const stageNbt = new NbtCompound();
        this.stage.writeNBT(stageNbt);
        root.putCompound('Stage', stageNbt);
        root.putUint('PhaseScore', this.phaseScore);

        return root;
    }

    public readNBT(nbt: NbtCompound) {
        const entityNbt = nbt.getCompoundList('Entities');
        if (entityNbt) this.loadEntity(entityNbt);

        const stageNbt = nbt.getCompound('Stage');
        if (stageNbt) this.stage.readNBT(stageNbt);
        this.phaseScore = nbt.getUint('PhaseScore');
    }

    private loadEntity(nbtList: NbtCompound[]) {
        for (const nbt of nbtList) {
            const typeName = nbt.getString('Type');
            const entityType = EntityType.get(typeName);

            if (!entityType) continue;
            const entity = entityType.create(this);
            entity.readNBT(nbt);
            this.spawnEntity(entity);
        }
    }

    public override clear(): void {
        super.clear();

        this.getPlayers().forEach(player => player.discard());
        this.entities.forEach(entity => entity.discard());
        this.entities.clear();
        this.trackedEntities.clear();
        this.entityManager.clear();
    }

    public saveAll(): NbtCompound {
        const root = new NbtCompound();
        this.writeNBT(root);
        return root;
    }

    public readonly ServerEntityHandler: EntityHandler<Entity> = {
        startTicking: (entity: Entity) => {
            this.entities.add(entity);

            const tracker = new EntityTrackerEntry(this, entity, entity.getType().getTrackingTickInterval(), false);
            this.trackedEntities.set(entity.getId(), tracker);
            this.getNetworkChannel().send(entity.createSpawnPacket());
        },

        stopTicking: (entity: Entity) => {
            this.entities.remove(entity);
            this.trackedEntities.delete(entity.getId());
            this.getNetworkChannel().send(new EntityRemoveS2CPacket(entity.getId(), entity.getUUID()));
        },

        startTracking: (_entity: Entity) => {
        },

        stopTracking: (_entity: Entity) => {
        }
    };
}