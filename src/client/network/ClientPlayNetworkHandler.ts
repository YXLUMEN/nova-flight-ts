import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {UUID} from "../../apis/types.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";
import {MobEntity} from "../../entity/mob/MobEntity.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {
    EntityS2CPacket,
    MoveRelative,
    Rotate,
    RotateAndMoveRelative
} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {EntityDamageS2CPacket} from "../../network/packet/s2c/EntityDamageS2CPacket.ts";
import {EntityKilledS2CPacket} from "../../network/packet/s2c/EntityKilledS2CPacket.ts";
import {ParticleS2CPacket} from "../../network/packet/s2c/ParticleS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {GaussianRandom} from "../../utils/math/GaussianRandom.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import {MissileLockS2CPacket} from "../../network/packet/s2c/MissileLockS2CPacket.ts";
import {PacketHandlerBuilder} from "../../network/PacketHandlerBuilder.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EVENTS} from "../../apis/IEvents.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";
import {EffectCreateS2CPacket} from "../../network/packet/s2c/EffectCreateS2CPacket.ts";
import {SoundEventS2CPacket} from "../../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../../network/packet/s2c/StopSoundS2CPacket.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {PlayerAddScoreS2CPacket} from "../../network/packet/s2c/PlayerAddScoreS2CPacket.ts";
import {ClientCommandSource} from "../command/ClientCommandSource.ts";
import {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import type {Payload} from "../../network/Payload.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import {OtherClientPlayerEntity} from "../entity/OtherClientPlayerEntity.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {PlayerDisconnectC2SPacket} from "../../network/packet/c2s/PlayerDisconnectC2SPacket.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";
import {EntityChooseTargetS2CPacket} from "../../network/packet/s2c/EntityChooseTargetS2CPacket.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {PlayerProfile} from "../../server/entity/PlayerProfile.ts";
import {SyncPlayerProfileS2CPacket} from "../../network/packet/s2c/SyncPlayerProfileS2CPacket.ts";

export class ClientPlayNetworkHandler {
    private readonly loginPlayer: Set<UUID> = new Set();
    private readonly commandSource: ClientCommandSource;
    private readonly commandDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();
    private readonly client: NovaFlightClient;
    private readonly random = new GaussianRandom();
    private world: ClientWorld | null = null;

    private maxSniffTimes = 32;
    private sniffInterval: number | undefined;

    public constructor(client: NovaFlightClient) {
        this.client = client;
        this.commandSource = new ClientCommandSource(this, client);
    }

    public sendPacket(packet: Payload) {
        this.client.networkChannel.send(packet);
    }

    private onRelayServer(packet: RelayServerPacket) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
        else if (type === 'ERR') this.relayErrorHandler(msg);
    }

    private relayInfoHandler(_message: string) {
    }

    private relayErrorHandler(message: string) {
        this.stopSniff();
        this.client.connectInfo?.setError(message);
    }

    public disconnect() {
        const uuid: UUID = this.client.clientId;
        if (!uuid) return;
        this.client.connectInfo?.setMessage('等待连接关闭...');
        this.sendPacket(new PlayerDisconnectC2SPacket(uuid));
    }

    public checkServer() {
        if (this.sniffInterval !== undefined) return;

        this.sendPacket(new ClientSniffingC2SPacket(this.client.clientId));

        let times = 0;
        this.sniffInterval = setInterval(() => {
            times++;
            this.sendPacket(new ClientSniffingC2SPacket(this.client.clientId));
            if (times >= this.maxSniffTimes) {
                this.stopSniff();
                this.client.connectInfo?.setError('无法连接至服务器');
            }
        }, 2000);
    }

    public onServerReady(_packet: ServerReadyS2CPacket) {
        this.stopSniff();

        this.loginPlayer.add(this.client.clientId);
        this.sendPacket(new PlayerAttemptLoginC2SPacket(
            this.client.clientId,
            this.client.networkChannel.sessionID,
            this.client.playerName
        ));
    }

    public async onGameJoin(packet: JoinGameS2CPacket) {
        this.world = new ClientWorld(this.client.registryManager);
        await this.client.joinGame(this.world);
        if (this.client.player === null) {
            const profile = new PlayerProfile(
                this.client.networkChannel.sessionID,
                this.client.clientId,
                this.client.playerName
            );
            this.client.player = new ClientPlayerEntity(this.world, this.client.input, profile);
            this.client.player.setYaw(-1.57079);
        }

        this.client.player.setUuid(this.client.clientId);
        this.client.player.setId(packet.playerEntityId);
        this.world.addEntity(this.client.player);
        this.world.setTicking(true);
        this.sendPacket(new PlayerFinishLoginC2SPacket(this.client.clientId));
    }

    public onDisconnect(packet: PlayerDisconnectS2CPacket) {
        const world = this.world;
        if (!world) return;

        const player = world.getEntityLookup().getByUUID(packet.uuid);
        if (!player) return;
        this.loginPlayer.delete(packet.uuid);
        this.world?.removeEntity(player.getId());

        if (packet.uuid === this.client.clientId) {
            this.client.window.notify.show(packet.reason);
            this.client.scheduleStop();
        }
    }

    public onEntity(packet: EntityS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        if (!entity.isLogicalSideForUpdatingMovement()) return;

        if (packet.positionChanged) {
            const trackedPos = entity.getTrackedPosition();
            const deltaPos = trackedPos.withDelta(packet.deltaX, packet.deltaY);
            trackedPos.setPos(deltaPos.x, deltaPos.y);
            const yaw = packet.rotate ? packet.yaw : entity.getLerpTargetYaw();

            entity.updateTrackedPositionAndAngles(deltaPos.x, deltaPos.y, yaw, 3);
        } else if (packet.rotate) {
            entity.updateTrackedPositionAndAngles(entity.getLerpTargetX(), entity.getLerpTargetY(), packet.yaw, 3);
        }
    }

    public onEntityPosition(packet: EntityPositionS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;

        entity.setTrackedPosition(packet.x, packet.y);
        if (!entity.isLogicalSideForUpdatingMovement()) {
            entity.updateTrackedPositionAndAngles(packet.x, packet.y, packet.yaw, 3);
        }
    }

    public onEntityPositionForce(packet: EntityPositionForceS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        entity.setTrackedPosition(packet.x, packet.y);
        entity.updateTrackedPositionAndAngles(packet.x, packet.y, packet.yaw, 0);
        entity.updatePosition(packet.x, packet.y);
        entity.updateYaw(packet.yaw);
    }

    public onEntitySpawn(packet: EntitySpawnS2CPacket): void {
        const entity = this.createEntity(packet);
        if (!entity) return;

        entity.onSpawnPacket(packet);
        this.world?.addEntity(entity);
    }

    private createEntity(packet: EntitySpawnS2CPacket): Entity | null {
        const world = this.world;
        if (!world) return null;

        const entityType = packet.entityType;
        if (entityType === EntityTypes.PLAYER) {
            if (this.loginPlayer.has(packet.uuid)) return null;

            this.loginPlayer.add(packet.uuid);
            return new OtherClientPlayerEntity(world);
        }

        return entityType.create(world);
    }

    public onEntityBatchSpawn(packet: EntityBatchSpawnS2CPacket): void {
        for (const entry of packet.entities) {
            this.onEntitySpawn(entry);
        }
    }

    public onEntityDamage(): void {
    }

    public onEntityKilled() {
    }

    public onEntityRemove(packet: EntityRemoveS2CPacket): void {
        this.world?.removeEntity(packet.id);
    }

    public onEntityVelocityUpdate(packet: EntityVelocityUpdateS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity) {
            entity.setVelocityClient(packet.velocityX, packet.velocityY);
        }
    }

    public onEntityTrackerUpdate(packet: EntityTrackerUpdateS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity) {
            entity.getDataTracker().writeUpdatedEntries(packet.trackedValues);
        }
    }

    public onMobAiBehavior(packet: MobAiS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        (entity as MobEntity).getAi().setBehavior((entity as MobEntity), packet.behavior);
    }

    public onMobChooseTarget(packet: EntityChooseTargetS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        (entity as MobEntity).getAi().setTarget(packet.target);
    }

    public onExplosion(packet: ExplosionS2CPacket) {
        this.world?.createExplosion(null, null, packet.x, packet.y, {
            attacker: null,
            explosionRadius: packet.radius,
            shake: packet.shack
        });
    }

    public onParticle(packet: ParticleS2CPacket): void {
        const world = this.world;
        if (!world) return;

        if (packet.count === 0) {
            const vx = packet.speed * packet.offsetX;
            const vy = packet.speed * packet.offsetY;
            world.addParticle(packet.posX, packet.posY, vx, vy, packet.life, packet.size, packet.colorFrom, packet.colorTo);
            return;
        }

        for (let i = packet.count; i--;) {
            const ox = this.random.nextGaussian() * packet.offsetX;
            const oy = this.random.nextGaussian() * packet.offsetY;
            const vx = this.random.nextGaussian() * packet.speed;
            const vy = this.random.nextGaussian() * packet.speed;
            world.addParticle(packet.posX + ox, packet.posY + oy, vx, vy, packet.life, packet.size, packet.colorFrom, packet.colorTo);
        }
    }

    public onEntityAttributes(packet: EntityAttributesS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        if (!(entity instanceof LivingEntity)) throw new Error(`Server tried to update attributes of a non-living entity: ${entity}`);
        const container = entity.getAttributes();

        for (const entry of packet.entries) {
            const instance = container.getCustomInstance(entry.attribute);
            if (!instance) {
                console.warn(`Entity ${entity} does not have attribute ${entry.attribute.getRegistryKey().getValue().toString()}`);
                continue;
            }
            instance.setBaseValue(entry.base);
            instance.clearModifiers();

            for (const modifier of entry.modifiers) {
                instance.addModifier(modifier);
            }
        }
    }

    public onMissileSet(packet: MissileSetS2CPacket): void {
        const missile = this.world?.getEntityById(packet.entityId);
        if (!missile) return;
        if (missile instanceof MissileEntity) {
            missile.driftAngle = packet.driftAngle;
            missile.hoverDir = packet.hoverDir;
        }
    }

    public onMissileLock(packet: MissileLockS2CPacket): void {
        const world = this.world;
        if (!world) return;

        const missile = world.getEntityById(packet.entityId);
        const locked = world.getEntityById(packet.lockEntityId);
        if (missile && missile instanceof MissileEntity) {
            missile.setTarget(locked);
            world.events.emit(EVENTS.ENTITY_LOCKED, {missile});
            if (missile.getLastTarget() !== locked) {
                world.events.emit(EVENTS.ENTITY_UNLOCKED, {missile, lastTarget: missile.getLastTarget()});
            }
        }
    }

    public onEntityNbt(packet: EntityNbtS2CPacket) {
        const world = this.world;
        if (!world) return;

        const entity = world.getEntityLookup().getByUUID(packet.entityUUID);
        if (!entity) return;
        entity.readNBT(packet.nbt);
    }

    public onInventory(packet: InventoryS2CPacket): void {
        const player = this.client.player!;
        player.updateSlotStacks(packet.revision, packet.contents);
    }

    public onEffectCreate(packet: EffectCreateS2CPacket) {
        this.world?.addEffect(null, packet.effect);
    }

    public onPlaySound(packet: SoundEventS2CPacket): void {
        const world = this.world;
        if (!world) return;

        if (packet.loop) {
            world.playLoopSound(null, packet.soundEvent, packet.volume, packet.pitch);
        } else {
            world.playSound(null, packet.soundEvent, packet.volume, packet.pitch);
        }
    }

    public onStopSound(packet: SoundEventS2CPacket): void {
        const world = this.world;
        if (!world) return;
        world.stopLoopSound(null, packet.soundEvent);
    }

    public onPlayerScore(packet: PlayerSetScoreS2CPacket): void {
        this.client.player?.setScore(packet.score);
    }

    public onPlayerAddScore(packet: PlayerAddScoreS2CPacket): void {
        const score = packet.decrease ? -packet.score : packet.score;
        const current = this.client.player?.getScore();
        if (!current) return;

        this.client.player?.setScore(current + score);
    }

    public onGameMessage(packet: GameMessageS2CPacket): void {
        const msg = packet.value;
        this.client.clientCommandManager.addPlainMessage(msg);
    }

    public onSyncProfile(packet: SyncPlayerProfileS2CPacket) {
        const player = this.client.player;
        if (!player) return;

        player.profile.setDevMode(packet.devMode);
    }

    public sendCommand(input: string): boolean {
        const command = input.startsWith('/') ? input.slice(1) : input;
        if (this.parse(command).exceptions.size === 0) {
            this.sendPacket(new CommandExecutionC2SPacket(command, this.client.clientId));
            return true;
        }
        return false;
    }

    public parse(command: string) {
        return this.commandDispatcher.parse(command, this.commandSource);
    }

    public getCommandDispatcher() {
        return this.commandDispatcher;
    }

    public getCommandSource() {
        return this.commandSource;
    }

    public getPlayerList() {
        return this.loginPlayer.values();
    }

    private stopSniff() {
        clearInterval(this.sniffInterval);
        this.sniffInterval = undefined;
    }

    public clear(): void {
        this.loginPlayer.clear();
        this.world = null;
        this.client.networkChannel.clearHandlers();
    }

    public registryHandler() {
        PacketHandlerBuilder.create()
            .add(RelayServerPacket.ID, this.onRelayServer)
            .add(ServerReadyS2CPacket.ID, this.onServerReady)
            .add(JoinGameS2CPacket.ID, this.onGameJoin)
            .add(PlayerDisconnectS2CPacket.ID, this.onDisconnect)
            .add(EntitySpawnS2CPacket.ID, this.onEntitySpawn)
            .add(EntityRemoveS2CPacket.ID, this.onEntityRemove)
            .add(EntityPositionS2CPacket.ID, this.onEntityPosition)
            .add(EntityPositionForceS2CPacket.ID, this.onEntityPositionForce)
            .add(MobAiS2CPacket.ID, this.onMobAiBehavior)
            .add(ExplosionS2CPacket.ID, this.onExplosion)
            .add(EntityVelocityUpdateS2CPacket.ID, this.onEntityVelocityUpdate)
            .add(EntityTrackerUpdateS2CPacket.ID, this.onEntityTrackerUpdate)
            .add(Rotate.ID, this.onEntity)
            .add(MoveRelative.ID, this.onEntity)
            .add(RotateAndMoveRelative.ID, this.onEntity)
            .add(EntityKilledS2CPacket.ID, this.onEntityKilled)
            .add(EntityDamageS2CPacket.ID, this.onEntityDamage)
            .add(ParticleS2CPacket.ID, this.onParticle)
            .add(EntityAttributesS2CPacket.ID, this.onEntityAttributes)
            .add(MissileSetS2CPacket.ID, this.onMissileSet)
            .add(MissileLockS2CPacket.ID, this.onMissileLock)
            .add(EntityBatchSpawnS2CPacket.ID, this.onEntityBatchSpawn)
            .add(EntityNbtS2CPacket.ID, this.onEntityNbt)
            .add(InventoryS2CPacket.ID, this.onInventory)
            .add(EffectCreateS2CPacket.ID, this.onEffectCreate)
            .add(SoundEventS2CPacket.ID, this.onPlaySound)
            .add(StopSoundS2CPacket.ID, this.onStopSound)
            .add(PlayerSetScoreS2CPacket.ID, this.onPlayerScore)
            .add(PlayerAddScoreS2CPacket.ID, this.onPlayerAddScore)
            .add(EntityChooseTargetS2CPacket.ID, this.onMobChooseTarget)
            .add(GameMessageS2CPacket.ID, this.onGameMessage)
            .add(SyncPlayerProfileS2CPacket.ID, this.onSyncProfile)
            .register(this.client.networkChannel, this);
    }
}
