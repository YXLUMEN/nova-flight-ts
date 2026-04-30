import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import type {Entity} from "../../entity/Entity.ts";
import {ClientWorld} from "../ClientWorld.ts";
import type {NovaFlightClient} from "../NovaFlightClient.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import type {UUID} from "../../type/types.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {EntityS2CPacket} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {ClientPlayerEntity} from "../entity/ClientPlayerEntity.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {EntityDamageS2CPacket} from "../../network/packet/s2c/EntityDamageS2CPacket.ts";
import {ParticleS2CPacket} from "../../network/packet/s2c/ParticleS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";
import {LivingEntity} from "../../entity/LivingEntity.ts";
import {GaussianRandom} from "../../utils/math/GaussianRandom.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";
import {EffectCreateS2CPacket} from "../../network/packet/s2c/EffectCreateS2CPacket.ts";
import {SoundEventS2CPacket} from "../../network/packet/s2c/SoundEventS2CPacket.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {PlayerAddScoreS2CPacket} from "../../network/packet/s2c/PlayerAddScoreS2CPacket.ts";
import {ClientCommandSource} from "../command/ClientCommandSource.ts";
import {CommandDispatcher} from "../../brigadier/CommandDispatcher.ts";
import type {Payload} from "../../network/Payload.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import {OtherClientPlayerEntity} from "../entity/OtherClientPlayerEntity.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {ClientReadyC2SPacket} from "../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {PlayerJoinS2CPacket} from "../../network/packet/s2c/PlayerJoinS2CPacket.ts";
import {GameProfile} from "../../server/entity/GameProfile.ts";
import {PlayerProfileSyncS2CPacket} from "../../network/packet/s2c/PlayerProfileSyncS2CPacket.ts";
import {EntityStatusEffectS2CPacket} from "../../network/packet/s2c/EntityStatusEffectS2CPacket.ts";
import {RemoveEntityStatusEffectS2CPacket} from "../../network/packet/s2c/RemoveEntityStatusEffectS2CPacket.ts";
import {StatusEffectInstance} from "../../entity/effect/StatusEffectInstance.ts";
import {ItemCooldownUpdateS2CPacket} from "../../network/packet/s2c/ItemCooldownUpdateS2CPacket.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {AudioManager} from "../../sound/AudioManager.ts";
import {ConnectInfo} from "../render/ui/ConnectInfo.ts";
import {AudioControlS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";
import {BGMManager} from "../../sound/BGMManager.ts";
import {AudioStopS2CPacket} from "../../network/packet/s2c/AudioStopS2CPacket.ts";
import {Audios} from "../../sound/Audios.ts";
import {type LaserWeaponS2CPacket} from "../../network/packet/s2c/LaserWeaponS2CPacket.ts";
import {LaserBeamEffect} from "../../effect/LaserBeamEffect.ts";
import {PhaseLasers} from "../../item/weapon/PhaseLasers.ts";
import {TargetDrone} from "../../entity/TargetDrone.ts";
import {DifficultChangeS2CPacket} from "../../network/packet/s2c/DifficultChangeS2CPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {TranslatableTextS2CPacket} from "../../network/packet/s2c/TranslatableTextS2CPacket.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {PongS2CPacket} from "../../network/packet/s2c/PongS2CPacket.ts";
import {PingC2SPacket} from "../../network/packet/c2s/PingC2SPacket.ts";
import {ServerStartS2CPacket} from "../../network/packet/s2c/ServerStartS2CPacket.ts";
import {RelayMessage} from "../../network/packet/relay/RelayMessage.ts";
import {BlockChangeS2CPacket} from "../../network/packet/s2c/BlockChangeS2CPacket.ts";
import {BatchBlockChangesPacket} from "../../network/packet/BatchBlockChangesPacket.ts";
import type {ClientConnection} from "./ClientConnection.ts";
import type {PacketListener} from "../../server/network/handler/PacketListener.ts";
import {ConnectionState, type ConnectionStateType} from "../../server/network/ConnectionState.ts";
import {SetPlayerInventoryS2CPacket} from "../../network/packet/s2c/SetPlayerInventoryPacket.ts";
import {PlayerPositionS2CPacket} from "../../network/packet/s2c/PlayerPositionS2CPacket.ts";
import {squareDist} from "../../utils/math/math.ts";
import {PreparedParticleS2CPacket} from "../../network/packet/s2c/PreparedParticleS2CPacket.ts";
import {ScreenShakeS2CPacket} from "../../network/packet/s2c/ScreenShakeS2CPacket.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import type {StopSoundS2CPacket} from "../../network/packet/s2c/StopSoundS2CPacket.ts";

export class ClientNetworkHandler implements PacketListener {
    private readonly playerProfiles: Map<UUID, GameProfile> = new Map();

    private readonly commandDispatcher: CommandDispatcher<ClientCommandSource> = new CommandDispatcher();

    private readonly client: NovaFlightClient;
    private readonly connection: ClientConnection;
    private readonly random = new GaussianRandom();
    private world: ClientWorld | null = null;

    private maxSniffTimes = 32;
    private sniffInterval: number | undefined = undefined;

    private pingInterval: number | undefined = undefined;
    private lastPingTime: number = 0;
    private latency: number = 0;

    public constructor(client: NovaFlightClient, connection: ClientConnection) {
        this.client = client;
        this.connection = connection;

        connection.setPacketListener(ConnectionState.PLAY, this);
    }

    public send(packet: Payload) {
        this.connection.send(packet);
    }

    public sendImmediate(packet: Payload) {
        this.connection.sendImmediately(packet);
    }

    public onDisconnected(): void {
    }

    public accepts(packet: Payload): void {
        packet.accept(this);
    }

    public getPhase(): ConnectionStateType {
        return ConnectionState.PLAY;
    }

    public checkServer() {
        if (this.sniffInterval !== undefined) return;

        this.sendImmediate(new ClientReadyC2SPacket(this.client.clientId));

        let times = 0;
        this.sniffInterval = setInterval(() => {
            times++;
            try {
                this.sendImmediate(new ClientReadyC2SPacket(this.client.clientId));
            } catch (e) {
                this.stopSniff();
                console.error(e);
            }
            if (times >= this.maxSniffTimes) {
                this.stopSniff();
                this.client.connectInfo?.setError('无法连接至服务器');
            }
        }, 2000);
    }

    public ping() {
        this.lastPingTime = performance.now();
        this.sendImmediate(PingC2SPacket.INSTANCE);
    }

    public onRelayMessage(packet: RelayMessage): void {
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

    public onServerStart(_: ServerStartS2CPacket) {
        this.stopSniff();
        this.checkServer();
    }

    public onServerReady(_: ServerReadyS2CPacket) {
        this.stopSniff();
        this.sendImmediate(new PlayerAttemptLoginC2SPacket(
            this.client.clientId,
            this.client.connection.getSessionId(),
            this.client.playerName
        ));
    }

    public onPong(_: PongS2CPacket) {
        this.smoothLatency(performance.now() - this.lastPingTime);
    }

    private smoothLatency(rrt: number) {
        rrt /= 2;
        if (this.latency === 0) {
            this.latency = rrt;
            return;
        }
        this.latency = this.latency * (1 - 0.2) + rrt * 0.2;
    }

    public async onGameJoin(packet: JoinGameS2CPacket) {
        this.world = new ClientWorld(this.client.registryManager, this.client.worldRender, packet.worldName);
        await this.client.joinGame(this.world);
        if (this.client.player === null) {
            const profile = new GameProfile(
                this.client.connection.getSessionId(),
                this.client.clientId,
                this.client.playerName
            );
            this.playerProfiles.set(profile.clientId, profile);
            this.client.player = new ClientPlayerEntity(this.world, this.client.input, profile);
            this.client.player.setYaw(-1.57079);
        }

        this.client.player.setUuid(this.client.clientId);
        this.client.player.setId(packet.playerEntityId);
        this.world.addEntity(this.client.player);
        this.client.setPause(false);
        this.client.window.hud.setPlayer(this.client.player);
        this.send(PlayerFinishLoginC2SPacket.INSTANCE);

        clearInterval(this.pingInterval);
        this.pingInterval = setInterval(() => this.ping(), 2000);
    }

    public onPlayerJoin(packet: PlayerJoinS2CPacket) {
        if (this.playerProfiles.has(packet.uuid)) return;
        this.playerProfiles.set(packet.uuid, new GameProfile(0, packet.uuid, packet.playerName));
        this.client.clientCommandManager.addPlainMessage(`\x1b[32m${packet.playerName}\x1b[0m join the game`);
    }

    public onPlayerDisconnect(packet: PlayerDisconnectS2CPacket) {
        const world = this.world;
        if (!world) return;

        this.playerProfiles.delete(packet.uuid);

        const player = world.getEntityLookup().getByUUID(packet.uuid);
        if (player) world.removeEntity(player.getId());

        if (packet.uuid !== this.client.clientId) return;

        clearInterval(this.pingInterval);
        this.client.setPause(true);

        this.client.connectInfo?.destroy();
        this.client.connectInfo = new ConnectInfo(this.client);
        this.client.connectInfo.setError(packet.reason.toString())
            .then(() => this.client.requestStop());
    }

    public onPlayerMove(packet: PlayerPositionS2CPacket): void {
        const player = this.client.player;
        if (!player) return;

        const change = packet.change;
        player.snapTo(change.position.x, change.position.y, change.yaw);
        player.setDeltaMovement(change.delta.x, change.delta.y);
    }

    public onEntity(packet: EntityS2CPacket) {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;
        if (entity.isLogicalSide()) return;

        if (packet.positionChanged) {
            const trackedPos = entity.getPositionDelta();
            const deltaPos = trackedPos.withDelta(packet.deltaX, packet.deltaY);
            trackedPos.setPos(deltaPos.x, deltaPos.y);

            const yaw = packet.rotate ? packet.yaw : entity.getLerpTargetYaw();
            entity.updatePositionAndAngles(deltaPos.x, deltaPos.y, yaw, 3);
        } else if (packet.rotate) {
            entity.updatePositionAndAngles(entity.getLerpTargetX(), entity.getLerpTargetY(), packet.yaw, 3);
        }
    }

    public onEntityPosition(packet: EntityPositionS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;

        entity.setDeltaMovement(packet.x, packet.y);
        if (!entity.isLogicalSide()) {
            entity.updatePositionAndAngles(packet.x, packet.y, packet.yaw, 3);
        } else if (entity === this.client.player) {
            if (squareDist(entity.getX(), entity.getY(), packet.x, packet.y) >= 128) {
                entity.updatePosition(packet.x, packet.y);
                entity.setDeltaMovement(0, 0);
            }
        }
    }

    public onForceEntityPosition(packet: EntityPositionForceS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (!entity) return;

        entity.setDeltaMovement(0, 0);
        entity.snapTo(packet.x, packet.y, packet.yaw);
    }

    public onEntitySpawn(packet: EntitySpawnS2CPacket): void {
        if (!this.world) return;
        const entity = this.createEntity(packet);
        if (!entity) return;

        entity.onSpawnPacket(packet);
        this.world.addEntity(entity);
    }

    private createEntity(packet: EntitySpawnS2CPacket): Entity | null {
        const entityType = packet.entityType;
        if (entityType === EntityTypes.PLAYER) {
            if (this.playerProfiles.has(packet.uuid)) return null;
            return new OtherClientPlayerEntity(this.world!);
        }

        return entityType.create(this.world!);
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
                packet.pos.x,
                packet.pos.y - 10,
                packet.damage,
                packet.color,
                20,
                packet.entityId
            );
            return;
        }

        if (entity instanceof TargetDrone) {
            entity.push(packet.damage);
        }

        const pos = entity.positionRef;
        this.client.window.damagePopup.spawnPopup(
            pos.x,
            pos.y - entity.getHeight(),
            packet.damage,
            packet.color,
            20,
            packet.entityId
        );
    }

    public onGameOver(): void {
        if (this.world && this.client.player) {
            this.world.gameOver();
        }
    }

    public onEntityKilled(): void {
    }

    public onEntityRemove(packet: EntityRemoveS2CPacket): void {
        this.world?.removeEntity(packet.entityId);
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

    public onExplosion(packet: ExplosionS2CPacket) {
        this.world?.createExplosion(null, null,
            packet.x, packet.y, packet.power,
            packet.behaviour,
            packet.visual
        );
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

    public onPreparedParticle(packet: PreparedParticleS2CPacket): void {
        if (!this.world) return;
        this.world.addPreparedParticle(packet.particle, packet.pos, packet.count, packet.baseAngle);
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

    public onEntityNbt(packet: EntityNbtS2CPacket) {
        const entity = this.world?.getEntityLookup().get(packet.entityId);
        if (!entity) return;
        entity.readNBT(packet.nbt);
    }

    public onInventory(packet: InventoryS2CPacket): void {
        if (!this.client.player) return;

        if (packet.revision === 0 || packet.revision > this.client.player.getRevision()) {
            this.client.player.updateSlotStacks(packet.revision, packet.contents);
        }
    }

    public onSetInventory(packet: SetPlayerInventoryS2CPacket): void {
        if (!this.client.player) return;
        packet.contents.setHolder(this.client.player);
        this.client.player.getInventory().setItem(packet.slot, packet.contents);
        this.client.player.reloadActiveSpecials();
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

    public onStopSound(packet: StopSoundS2CPacket): void {
        const world = this.world;
        if (!world) return;
        world.stopLoopSound(null, packet.soundEvent);
    }

    public onPlayAudio(packet: PlayAudioS2CPacket): void {
        AudioManager.playAudio(packet.audio, packet.loop);
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
                BGMManager.next();
                break;
            case 4:
                AudioManager.leap(packet.leap);
                break;
        }
    }

    public onAudioStop(packet: AudioStopS2CPacket): void {
        if (packet.audio !== AudioManager.getCurrentPlaying()) return;
        AudioManager.stop();

        if (packet.audio === Audios.BOSS_PHASE) {
            BGMManager.next();
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

    public onTranslateText(packet: TranslatableTextS2CPacket): void {
        const text = new TranslatableText(packet.key, packet.args);
        this.client.clientCommandManager.addPlainMessage(text.toString());
    }

    public onSyncProfile(packet: PlayerProfileSyncS2CPacket): void {
        const player = this.client.player;
        if (!player) return;

        player.setDevMode(packet.devMode);
    }

    public onEntityEffect(packet: EntityStatusEffectS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity instanceof LivingEntity) {
            const registryEntry = packet.effectId;
            const instance = new StatusEffectInstance(registryEntry, packet.duration, packet.amplifier);
            entity.setStatusEffect(instance, null);
        }
    }

    public onRemoveEntityEffect(packet: RemoveEntityStatusEffectS2CPacket): void {
        const entity = this.world?.getEntityById(packet.entityId);
        if (entity instanceof LivingEntity) {
            entity.removeEffectNoUpdate(packet.effectId);
        }
    }

    public onItemCooldown(packet: ItemCooldownUpdateS2CPacket): void {
        const player = this.client.player;
        if (!player) return;
        player.cooldownManager.set(packet.item, packet.duration);
    }

    public onLaserWeapon(packet: LaserWeaponS2CPacket) {
        const holder = this.world?.getEntityById(packet.entityId);
        if (!holder || holder === this.client.player) return;

        if (packet.activate) {
            const beamFx = PhaseLasers.id2EffectMap.get(packet.entityId);
            if (beamFx && beamFx.isAlive()) {
                beamFx.kill();
            }
            const newBeamFx = new LaserBeamEffect(packet.color, packet.width, 0.5);
            newBeamFx.reset(packet.start, packet.end);
            PhaseLasers.id2EffectMap.set(packet.entityId, newBeamFx);
            this.world!.addEffect(null, newBeamFx);
        } else if (packet.change) {
            const beamFx = PhaseLasers.id2EffectMap.get(packet.entityId);
            if (beamFx) {
                beamFx.setByVec(packet.start, packet.end);
            }
        } else {
            const beamFx = PhaseLasers.id2EffectMap.get(packet.entityId);
            if (beamFx) {
                beamFx.kill();
                PhaseLasers.id2EffectMap.delete(packet.entityId);
            }
        }
    }

    public onDifficultChange(packet: DifficultChangeS2CPacket): void {
        if (this.world) {
            this.world.setDifficulty(packet.difficult);
        }
    }

    public onBlockChange(packet: BlockChangeS2CPacket): void {
        if (this.world) {
            this.world.getMap().set(packet.x, packet.y, packet.type);
        }
    }

    public onBatchChanges(packet: BatchBlockChangesPacket): void {
        if (!this.world) return;
        const map = this.world.getMap();
        packet.foreach((type, x, y) => map.set(x, y, type));
    }

    public onScreenShake(packet: ScreenShakeS2CPacket): void {
        this.client.window.camera.addShake(packet.amount, packet.limit);
    }

    public sendCommand(input: string): boolean {
        const command = input.startsWith('/') ? input.slice(1) : input;
        if (this.parse(command).exceptions.size === 0) {
            this.send(new CommandExecutionC2SPacket(command));
            return true;
        }
        return false;
    }

    public parse(command: string) {
        return this.commandDispatcher.parse(command, this.client.commandSource);
    }

    public getCommandDispatcher() {
        return this.commandDispatcher;
    }

    public getPlayerList() {
        return this.playerProfiles.values();
    }

    public getLatency() {
        return this.latency;
    }

    private stopSniff() {
        clearInterval(this.sniffInterval);
        this.sniffInterval = undefined;
    }

    public destroy() {
        this.clear();
    }

    public clear(): void {
        clearInterval(this.pingInterval);
        clearInterval(this.sniffInterval);
        this.playerProfiles.clear();
        this.world = null;
    }
}
