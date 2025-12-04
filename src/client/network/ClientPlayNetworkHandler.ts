import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
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
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import {OtherClientPlayerEntity} from "../entity/OtherClientPlayerEntity.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {PlayerDisconnectC2SPacket} from "../../network/packet/c2s/PlayerDisconnectC2SPacket.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";
import {EntityChooseTargetS2CPacket} from "../../network/packet/s2c/EntityChooseTargetS2CPacket.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {GameProfile} from "../../server/entity/GameProfile.ts";
import {SyncPlayerProfileS2CPacket} from "../../network/packet/s2c/SyncPlayerProfileS2CPacket.ts";
import {EntityStatusEffectS2CPacket} from "../../network/packet/s2c/EntityStatusEffectS2CPacket.ts";
import {RemoveEntityStatusEffectS2CPacket} from "../../network/packet/s2c/RemoveEntityStatusEffectS2CPacket.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {ItemCooldownUpdateS2CPacket} from "../../network/packet/s2c/ItemCooldownUpdateS2CPacket.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {AudioManager} from "../../sound/AudioManager.ts";
import {ConnectInfo} from "../render/ui/ConnectInfo.ts";
import {GameOverS2CPacket} from "../../network/packet/s2c/GameOverS2CPacket.ts";
import {AudioControlS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";
import {BGMManager} from "../../sound/BGMManager.ts";

export class ClientPlayNetworkHandler {
    private readonly loginPlayer: Set<UUID> = new Set();
    private readonly commandSource: ClientCommandSource;
    private readonly commandDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();
    private readonly client: NovaFlightClient;
    private readonly random = new GaussianRandom();
    private world: ClientWorld | null = null;

    private maxSniffTimes = 32;
    private sniffInterval: number | undefined = undefined;

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
        try {
            this.client.connectInfo?.setMessage('等待连接关闭...');
            this.sendPacket(new PlayerDisconnectC2SPacket());
        } catch (error) {
            console.error(error);
        }
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

    public onServerReady(_: ServerReadyS2CPacket) {
        this.stopSniff();

        this.loginPlayer.add(this.client.clientId);
        this.sendPacket(new PlayerAttemptLoginC2SPacket(
            this.client.clientId,
            this.client.networkChannel.getSessionId(),
            this.client.playerName
        ));
    }

    public async onGameJoin(packet: JoinGameS2CPacket) {
        this.world = new ClientWorld(this.client.registryManager);
        await this.client.joinGame(this.world);
        if (this.client.player === null) {
            const profile = new GameProfile(
                this.client.networkChannel.getSessionId(),
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
        this.sendPacket(new PlayerFinishLoginC2SPacket());
    }

    public onDisconnect(packet: PlayerDisconnectS2CPacket) {
        const world = this.world;
        if (!world) return;

        const player = world.getEntityLookup().getByUUID(packet.uuid);
        if (!player) return;
        this.loginPlayer.delete(packet.uuid);
        this.world?.removeEntity(player.getId());

        if (packet.uuid !== this.client.clientId) return;

        this.client.world?.setTicking(false);
        const info = new ConnectInfo(this.client.window.ctx);
        info.setError(packet.reason)
            .then(() => this.client.scheduleStop());
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

    public onEntityDamage(packet: EntityDamageS2CPacket): void {
        const world = this.world;
        if (!world) return;

        const entity = world.getEntityById(packet.entityId);
        if (!entity) {
            this.client.window.damagePopup.spawnPopup(
                packet.pos.x, packet.pos.y - 10, packet.damage, '#ff3434', 20, packet.entityId
            );
            return;
        }

        const pos = entity.getPositionRef;
        this.client.window.damagePopup.spawnPopup(
            pos.x, pos.y - entity.getHeight(), packet.damage, '#ff3434', 20, packet.entityId
        );
    }

    public onGameOver(): void {
        this.world?.gameOver();
    }

    public onEntityKilled(): void {
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
            shake: packet.shack,
            explodeColor: packet.color,
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
        this.client.player!.updateSlotStacks(packet.revision, packet.contents);
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

    public onPlayAudio(packet: PlayAudioS2CPacket): void {
        AudioManager.playAudio(packet.audio);
        AudioManager.setVolume(packet.volume);
    }

    public onAudioControl(packet: AudioControlS2CPacket): void {
        switch (packet.action) {
            case 0:
                AudioManager.pause();
                break;
            case 1:
                AudioManager.resume();
                break;
            case 2:
                AudioManager.reset()
                break;
            case 3:
                AudioManager.stop();
                break;
            case 4:
                BGMManager.next();
                break;
        }
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

    public onSyncProfile(packet: SyncPlayerProfileS2CPacket): void {
        const player = this.client.player;
        if (!player) return;

        player.setDevMode(packet.devMode);
    }

    public onEntityStatusEffect(packet: EntityStatusEffectS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity instanceof LivingEntity) {
            const registryEntry = packet.effectId;
            const instance = new StatusEffectInstance(registryEntry, packet.duration, packet.amplifier);
            entity.setStatusEffect(instance, null);
        }
    }

    public onRemoveEntityStatusEffect(packet: RemoveEntityStatusEffectS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity instanceof LivingEntity) {
            entity.removeStatusEffectInternal(packet.effectId);
        }
    }

    public onItemCooldown(packet: ItemCooldownUpdateS2CPacket): void {
        const player = this.client.player;
        if (!player) return;
        player.cooldownManager.set(packet.item, packet.duration);
    }

    public sendCommand(input: string): boolean {
        const command = input.startsWith('/') ? input.slice(1) : input;
        if (this.parse(command).exceptions.size === 0) {
            this.sendPacket(new CommandExecutionC2SPacket(command));
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

    private register<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.client.networkChannel.receive(id, handler as Consumer<Payload>);
    }

    public registryHandler() {
        this.register(RelayServerPacket.ID, this.onRelayServer.bind(this));
        this.register(ServerReadyS2CPacket.ID, this.onServerReady.bind(this));
        this.register(JoinGameS2CPacket.ID, this.onGameJoin.bind(this));
        this.register(PlayerDisconnectS2CPacket.ID, this.onDisconnect.bind(this));
        this.register(EntitySpawnS2CPacket.ID, this.onEntitySpawn.bind(this));
        this.register(EntityRemoveS2CPacket.ID, this.onEntityRemove.bind(this));
        this.register(EntityPositionS2CPacket.ID, this.onEntityPosition.bind(this));
        this.register(EntityPositionForceS2CPacket.ID, this.onEntityPositionForce.bind(this));
        this.register(MobAiS2CPacket.ID, this.onMobAiBehavior.bind(this));
        this.register(ExplosionS2CPacket.ID, this.onExplosion.bind(this));
        this.register(EntityVelocityUpdateS2CPacket.ID, this.onEntityVelocityUpdate.bind(this));
        this.register(EntityTrackerUpdateS2CPacket.ID, this.onEntityTrackerUpdate.bind(this));
        this.register(Rotate.ID, this.onEntity.bind(this));
        this.register(MoveRelative.ID, this.onEntity.bind(this));
        this.register(RotateAndMoveRelative.ID, this.onEntity.bind(this));
        this.register(EntityKilledS2CPacket.ID, this.onEntityKilled.bind(this));
        this.register(EntityDamageS2CPacket.ID, this.onEntityDamage.bind(this));
        this.register(ParticleS2CPacket.ID, this.onParticle.bind(this));
        this.register(EntityAttributesS2CPacket.ID, this.onEntityAttributes.bind(this));
        this.register(MissileSetS2CPacket.ID, this.onMissileSet.bind(this));
        this.register(MissileLockS2CPacket.ID, this.onMissileLock.bind(this));
        this.register(EntityBatchSpawnS2CPacket.ID, this.onEntityBatchSpawn.bind(this));
        this.register(EntityNbtS2CPacket.ID, this.onEntityNbt.bind(this));
        this.register(InventoryS2CPacket.ID, this.onInventory.bind(this));
        this.register(EffectCreateS2CPacket.ID, this.onEffectCreate.bind(this));
        this.register(SoundEventS2CPacket.ID, this.onPlaySound.bind(this));
        this.register(StopSoundS2CPacket.ID, this.onStopSound.bind(this));
        this.register(PlayerSetScoreS2CPacket.ID, this.onPlayerScore.bind(this));
        this.register(PlayerAddScoreS2CPacket.ID, this.onPlayerAddScore.bind(this));
        this.register(EntityChooseTargetS2CPacket.ID, this.onMobChooseTarget.bind(this));
        this.register(GameMessageS2CPacket.ID, this.onGameMessage.bind(this));
        this.register(SyncPlayerProfileS2CPacket.ID, this.onSyncProfile.bind(this));
        this.register(EntityStatusEffectS2CPacket.ID, this.onEntityStatusEffect.bind(this));
        this.register(RemoveEntityStatusEffectS2CPacket.ID, this.onRemoveEntityStatusEffect.bind(this));
        this.register(ItemCooldownUpdateS2CPacket.ID, this.onItemCooldown.bind(this));
        this.register(PlayAudioS2CPacket.ID, this.onPlayAudio.bind(this));
        this.register(GameOverS2CPacket.ID, this.onGameOver.bind(this));
        this.register(AudioControlS2CPacket.ID, this.onAudioControl.bind(this));
    }
}
