import {World} from "../world/World.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import type {NovaFlightServer} from "./NovaFlightServer.ts";
import type {IEffect} from "../effect/IEffect.ts";
import type {MutVec2} from "../utils/math/MutVec2.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {SoundEventS2CPacket} from "../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../network/packet/s2c/StopSoundS2CPacket.ts";
import type {Entity} from "../entity/Entity.ts";
import {EntityType} from "../entity/EntityType.ts";
import {EntityList} from "../world/EntityList.ts";
import {ServerEntityManager} from "../world/ServerEntityManager.ts";
import type {EntityHandler} from "../world/EntityHandler.ts";
import type {UUID} from "../apis/registry.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {collideEntityCircle} from "../utils/math/math.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {Stage} from "../stage/Stage.ts";
import type {ServerNetworkChannel} from "./network/ServerNetworkChannel.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {EntitySpawnS2CPacket} from "../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {EntityRemoveS2CPacket} from "../network/packet/s2c/EntityRemoveS2CPacket.ts";

export class ServerWorld extends World implements NbtSerializable {
    private readonly server: NovaFlightServer;

    private stage!: Stage;

    private readonly players = new Map<UUID, ServerPlayerEntity>();
    private readonly entities: EntityList = new EntityList();
    private readonly entityManager: ServerEntityManager<Entity>;

    public constructor(registryManager: RegistryManager, server: NovaFlightServer) {
        super(registryManager, false);

        this.server = server;
        this.entityManager = new ServerEntityManager(this.ServerEntityHandler);
        this.stage = STAGE;

        this.onEvent();
    }

    public override tick(dt: number) {
        super.tick(dt);

        for (const entity of this.entities.values()) {
            if (entity.isRemoved()) continue;
            this.serverTickEntity(entity);
            if (this.over) break;
        }
        this.entities.processRemovals();
    }

    public serverTickEntity(entity: Entity): void {
        entity.age++;
        entity.tick();

        if (entity.isPlayer()) return;
        this.players.values().forEach(player => {
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

    public override getNetworkChannel(): ServerNetworkChannel {
        return this.server.networkChannel;
    }

    public spawnEntity(entity: Entity): boolean {
        if (this.peaceMod && entity instanceof MobEntity) {
            return false;
        }
        if (entity.isRemoved()) {
            console.warn(`Tried to add entity ${EntityType.getId(entity.getType())} but it was marked as removed already`);
            return false;
        }

        return this.entityManager.addEntity(entity);
    }

    public spawnPlayer(player: ServerPlayerEntity): void {
        this.players.set(player.getUuid(), player);
        this.entityManager.addEntity(player);
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

    public gerEntity(uuid: UUID): Entity | null {
        return this.getEntityLookup().getByUUID(uuid);
    }

    public override getEntityLookup() {
        return this.entityManager.getIndex();
    }

    public getEntities(): EntityList {
        return this.entities;
    }

    public getPlayers() {
        return this.players.values();
    }

    public getMobs(): ReadonlySet<MobEntity> {
        return this.entities.getMobs();
    }

    public getProjectiles(): ReadonlySet<ProjectileEntity> {
        return this.entities.getProjectiles();
    }

    public getEntity(uuid: string): Entity | null {
        return this.entityManager.getIndex().getByUUID(uuid);
    }

    public playSound(sound: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, false));
    }

    public playLoopSound(sound: SoundEvent, volume: number = 1, pitch: number = 1): void {
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, true));
    }

    public stopLoopSound(sounds: SoundEvent): boolean {
        this.getNetworkChannel().send(new StopSoundS2CPacket(sounds));
        return true;
    }

    // @ts-ignore
    public addEffect(effect: IEffect): void {
    }

    // @ts-ignore
    public spawnParticleByVec(pos: MutVec2, vel: MutVec2, life: number, size: number, colorFrom: string, colorTo: string, drag: number, gravity: number): void {
    }

    // @ts-ignore
    public spawnParticle(posX: number, posY: number, velX: number, velY: number, life: number, size: number, colorFrom: string, colorTo: string, drag: number, gravity: number): void {
    }

    private onEvent() {
        this.events.on(EVENTS.ENTITY_REMOVED, event => {
            this.entityManager.remove(event.entity);
        });
    }

    public writeNBT(root: NbtCompound): NbtCompound {
        const entityList: NbtCompound[] = [];
        this.entities.forEach(entity => {
            if (!entity.shouldSave()) return;

            const nbt = new NbtCompound();
            const type = EntityType.getId(entity.getType())!;
            nbt.putString('Type', type.toString());
            entity.writeNBT(nbt);
            entityList.push(nbt);
        });
        root.putCompoundList('Entities', entityList);

        const stageNbt = new NbtCompound();
        this.stage.writeNBT(stageNbt);
        root.putCompound('Stage', stageNbt);

        return root;
    }

    public readNBT(nbt: NbtCompound) {
        const entityNbt = nbt.getCompoundList('Entities');
        if (entityNbt) this.loadEntity(entityNbt);

        const stageNbt = nbt.getCompound('Stage');
        if (stageNbt) this.stage.readNBT(stageNbt);
    }

    private loadEntity(nbtList: NbtCompound[]) {
        for (const nbt of nbtList) {
            const typeName = nbt.getString('Type');
            const entityType = EntityType.get(typeName);
            if (!entityType) continue;

            const entity = entityType.create(this) as Entity;
            entity.readNBT(nbt);
            this.spawnEntity(entity);
        }
    }

    public saveAll(): NbtCompound {
        const root = new NbtCompound();
        this.writeNBT(root);
        return root;
    }

    public readonly ServerEntityHandler: EntityHandler<Entity> = {
        startTicking: (entity: Entity) => {
            this.entities.add(entity);
            this.getNetworkChannel().send(EntitySpawnS2CPacket.create(entity));
        },

        stopTicking: (entity: Entity) => {
            this.entities.remove(entity);
            this.getNetworkChannel().send(new EntityRemoveS2CPacket(entity.getId(), entity.getUuid()));
        },
    };
}