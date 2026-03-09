import {World} from "../world/World.ts";
import {RegistryManager} from "../registry/RegistryManager.ts";
import {type NovaFlightServer} from "./NovaFlightServer.ts";
import type {NbtSerializable} from "../nbt/NbtSerializable.ts";
import {NbtCompound} from "../nbt/element/NbtCompound.ts";
import type {SoundEvent} from "../sound/SoundEvent.ts";
import {SoundEventS2CPacket} from "../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../network/packet/s2c/StopSoundS2CPacket.ts";
import {type Entity} from "../entity/Entity.ts";
import {EntityType} from "../entity/EntityType.ts";
import {EntityList} from "../world/entity/EntityList.ts";
import {ServerEntityManager} from "../world/entity/ServerEntityManager.ts";
import type {EntityHandler} from "../world/entity/EntityHandler.ts";
import type {UUID} from "../apis/types.ts";
import {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {MobEntity} from "../entity/mob/MobEntity.ts";
import {CIWSBulletEntity} from "../entity/projectile/CIWSBulletEntity.ts";
import {ProjectileEntity} from "../entity/projectile/ProjectileEntity.ts";
import type {Stage} from "../stage/Stage.ts";
import {STAGE} from "../configs/StageConfig.ts";
import {EVENTS} from "../apis/IEvents.ts";
import {EntityRemoveS2CPacket} from "../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityTrackerEntry} from "./network/EntityTrackerEntry.ts";
import type {DamageSource} from "../entity/damage/DamageSource.ts";
import type {ExplosionOpts} from "../apis/IExplosionOpts.ts";
import type {Explosion} from "../world/Explosion.ts";
import {ExplosionS2CPacket} from "../network/packet/s2c/ExplosionS2CPacket.ts";
import {ServerDefaultEvents} from "./event/ServerDefaultEvents.ts";
import {type MutVec2} from "../utils/math/MutVec2.ts";
import {ParticleS2CPacket} from "../network/packet/s2c/ParticleS2CPacket.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {encodeColorHex, encodeToUnsignedByte} from "../utils/NetUtil.ts";
import {type VisualEffect} from "../effect/VisualEffect.ts";
import {EffectCreateS2CPacket} from "../network/packet/s2c/EffectCreateS2CPacket.ts";
import type {ServerChannel} from "./network/ServerChannel.ts";
import {GameOverS2CPacket} from "../network/packet/s2c/GameOverS2CPacket.ts";
import {EMPBurst} from "../effect/EMPBurst.ts";
import {DifficultChangeS2CPacket} from "../network/packet/s2c/DifficultChangeS2CPacket.ts";
import {Log} from "../worker/log.ts";

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

        this.registerEvents();
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

        if (this.empBurst > 0) this.empBurst--;
    }

    private bindTickEntity = this.serverTickEntity.bind(this);

    private serverTickEntity(entity: Entity): void {
        entity.resetPrevious();
        entity.age++;
        entity.tick();

        if (entity.isPlayer()) return;
        this.getPlayers().forEach(player => {
            this.tickOtherEntity(entity, player);
        });
    }

    private tickOtherEntity(entity: Entity, player: ServerPlayerEntity): void {
        // 敌方碰撞
        if (entity instanceof MobEntity) {
            if (player.invulnerable || !entity.isCollisionTo(player)) return;
            entity.attack(player);
            return;
        }

        // 弹射物碰撞
        if (entity instanceof ProjectileEntity) {
            const owner = entity.getOwner();
            // 敌方命中
            if (!owner || owner instanceof MobEntity) {
                if (player.invulnerable || player.isRemoved() || !entity.isCollisionTo(player)) return;
                entity.onEntityHit(player);
                return;
            }

            // 玩家近防炮命中
            if (entity instanceof CIWSBulletEntity) {
                for (const projectile of this.getProjectiles()) {
                    if (projectile.getOwner() === owner || !entity.isCollisionTo(projectile)) continue;

                    entity.discard();
                    projectile.onIntercept(entity.getHitDamage());
                    return;
                }
            }

            // 玩家命中
            for (const mob of this.getMobs()) {
                if (entity.isCollisionTo(mob)) {
                    entity.onEntityHit(mob);
                    if (entity.isRemoved()) return;
                }
            }
        }
    }

    public override gameOver(player: ServerPlayerEntity): void {
        if (!this.server.isHost(player.getProfile())) {
            player.networkHandler!.send(new GameOverS2CPacket());
            return;
        }

        this.over = true;
        this.setTicking(false);
        this.getNetworkChannel().send(new GameOverS2CPacket());
        this.events.emit(EVENTS.GAME_OVER, null);
    }

    public override getNetworkChannel(): ServerChannel {
        return this.server.networkChannel;
    }

    public override setTicking(ticking: boolean = true) {
        if (this.getServer().isMultiPlayer) return;
        super.setTicking(ticking);
    }

    /**
     * 将传入实体直接加入世界,忽视世界状态
     * */
    public override addEntity(entity: Entity): void {
        this.entityManager.addEntity(entity);
    }

    /**
     * 在世界中生成实体的标准方式
     * 区别于
     * @see {addEntity}
     * */
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

    public addPlayer(player: ServerPlayerEntity): void {
        const entity = this.getEntity(player.getUUID());
        if (entity) {
            console.warn(`Force-added player with duplicate UUID ${player.getUUID()}`);
            entity.discard();
            this.removePlayer(entity as ServerPlayerEntity);
        }

        this.entityManager.addEntity(player);
    }

    public override removeEntity(entityId: number): void {
        this.getEntityLookup().get(entityId)?.discard();
    }

    public removePlayer(player: ServerPlayerEntity): void {
        player.discard();
    }

    public override getEntityById(id: number): Entity | null {
        return this.getEntityLookup().get(id);
    }

    public getEntity(uuid: UUID): Entity | null {
        return this.getEntityLookup().getByUUID(uuid);
    }

    public override getEntityLookup() {
        return this.entityManager.getLookup();
    }

    public override getEntities(): EntityList {
        return this.entities;
    }

    public override getPlayers() {
        return this.server.playerManager.getAllPlayers();
    }

    public override getMobs(): ReadonlySet<MobEntity> {
        return this.entities.getMobs();
    }

    public override getProjectiles(): ReadonlySet<ProjectileEntity> {
        return this.entities.getProjectiles();
    }

    public setDifficulty(difficulty: number) {
        if (difficulty === this.getDifficulty()) return;
        super.setDifficulty(difficulty);
        this.sendPacket(new DifficultChangeS2CPacket(difficulty));
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
        if (entity instanceof ServerPlayerEntity) {
            this.getNetworkChannel()
                .sendExclude(new SoundEventS2CPacket(sound, volume, pitch, false), entity.getProfile());
            return;
        }
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, false));
    }

    public override playLoopSound(entity: Entity | null, sound: SoundEvent, volume: number = 1, pitch: number = 1): void {
        if (entity instanceof ServerPlayerEntity) {
            this.getNetworkChannel()
                .sendExclude(new SoundEventS2CPacket(sound, volume, pitch, true), entity.getProfile());
            return;
        }
        this.getNetworkChannel().send(new SoundEventS2CPacket(sound, volume, pitch, true));
    }

    public override stopLoopSound(_: Entity | null, sounds: SoundEvent): boolean {
        this.getNetworkChannel().send(new StopSoundS2CPacket(sounds));
        return true;
    }

    public override addEffect(): void {
    }

    public spawnEffect(source: Entity | null, effect: VisualEffect): void {
        if (source instanceof ServerPlayerEntity) {
            this.getNetworkChannel().sendExclude(new EffectCreateS2CPacket(effect), source.getProfile());
            return;
        }
        this.getNetworkChannel().send(new EffectCreateS2CPacket(effect));
    }

    public override createExplosion(
        source: Entity | null,
        damage: DamageSource | null,
        x: number,
        y: number,
        opts: ExplosionOpts
    ): Explosion {
        const explosion = super.createExplosion(source, damage, x, y, opts);

        const shack = encodeToUnsignedByte(opts.shake ?? 0, 1);
        const packet = new ExplosionS2CPacket(x, y,
            opts.explosionRadius ?? 64,
            shack,
            encodeColorHex(opts.explodeColor ?? '#fff'),
        );
        this.getNetworkChannel().send(packet);

        this.events.emit(EVENTS.EXPLOSION, {explosion});
        return explosion;
    }

    public override createEMP(attacker: Entity | null, pos: MutVec2, radius: number, duration: number = 40, damage: number) {
        super.createEMP(attacker, pos, radius, duration, damage);
        this.spawnEffect(null, new EMPBurst(pos, radius));
    }

    public spawnParticle(
        posX: number, posY: number, offsetX: number, offsetY: number,
        count: number, speed: number, life: number, size: number,
        colorFrom: string, colorTo?: string): void {
        this.getNetworkChannel().send(ParticleS2CPacket.create(
            posX, posY, offsetX, offsetY, count, speed, life, size, colorFrom, colorTo ?? colorFrom
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

    private registerEvents() {
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
            const typeId = EntityType.getId(type);
            if (!typeId) {
                Log.warn(`EntityType ${type.toString()} maybe unregistered.`);
                return;
            }

            const nbt = new NbtCompound();
            nbt.putString('type', typeId.toString());
            entity.writeNBT(nbt);
            entityList.push(nbt);
        });
        root.putCompoundArray('entities', entityList);

        const stageNbt = new NbtCompound();
        this.stage.writeNBT(stageNbt);
        root.putCompound('stage', stageNbt);
        root.putUint32('phase_score', this.phaseScore);
        root.putInt8('difficulty', this.getDifficulty());

        return root;
    }

    public readNBT(nbt: NbtCompound) {
        const entityNbt = nbt.getCompoundArray('entities');
        if (entityNbt) this.loadEntity(entityNbt);

        const stageNbt = nbt.getCompound('stage');
        if (stageNbt) this.stage.readNBT(stageNbt);
        this.phaseScore = nbt.getUint32('phase_score');
        this.setDifficulty(nbt.getInt8('difficulty', 1));
    }

    private loadEntity(nbtList: NbtCompound[]) {
        for (const nbt of nbtList) {
            const typeName = nbt.getString('type');
            const entityType = EntityType.get(typeName);

            if (!entityType) continue;
            const entity = entityType.create(this);
            try {
                entity.readNBT(nbt);
            } catch (err) {
                Log.error(String(err));
                continue;
            }
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
        return this.writeNBT(new NbtCompound());
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
            this.getNetworkChannel().send(new EntityRemoveS2CPacket(entity.getId()));
        },

        startTracking: (_entity: Entity) => {
        },

        stopTracking: (_entity: Entity) => {
        }
    };
}