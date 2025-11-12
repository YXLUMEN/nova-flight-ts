import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {PacketHandlerBuilder} from "../../network/PacketHandlerBuilder.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerDisconnectC2SPacket} from "../../network/packet/c2s/PlayerDisconnectC2SPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {RequestPositionC2SPacket} from "../../network/packet/c2s/RequestPositionC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {UUID} from "../../apis/types.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {applyServerTech} from "../../tech/applyServerTech.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {PlayerTechResetC2SPacket} from "../../network/packet/c2s/PlayerTechResetC2SPacket.ts";
import {PlayerMoveByPointerC2SPacket} from "../../network/packet/c2s/PlayerMoveByPointerC2SPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import type {ParseResults} from "../../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../command/ServerCommandSource.ts";
import {PlayerProfile} from "../entity/PlayerProfile.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";

export class ServerPlayNetworkHandler {
    private readonly server: NovaFlightServer;
    private readonly channel: ServerNetworkChannel;
    private readonly world: ServerWorld;

    private readonly uuidToPlayer: Map<UUID, PlayerProfile> = new Map();
    private readonly sessionIdToPlayer: Map<number, PlayerProfile> = new Map();

    public constructor(server: NovaFlightServer, world: ServerWorld) {
        this.server = server;
        this.world = world;
        this.channel = server.networkChannel;
    }

    private onRelayServer(packet: RelayServerPacket) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
    }

    private relayInfoHandler(_message: string): void {
    }

    public disconnect(target: UUID, reason: string): void {
        this.channel.sendTo(new PlayerDisconnectS2CPacket(target, reason), target);
    }

    public disconnectAllPlayer(): void {
        for (const player of this.uuidToPlayer.keys()) {
            this.disconnect(player, 'ServerClose');
        }
    }

    public async onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket): Promise<void> {
        const clientId: UUID = packet.clientId;

        if (this.uuidToPlayer.has(clientId)) {
            console.warn(`Server attempted to add player prior to sending player info (Player id ${clientId})`);
            return;
        }

        const profile = new PlayerProfile(packet.sessionId, packet.clientId, packet.playerName);
        this.uuidToPlayer.set(clientId, profile);
        this.sessionIdToPlayer.set(packet.sessionId, profile);

        const player = new ServerPlayerEntity(this.world, profile);
        player.setUuid(clientId);
        this.world.spawnPlayer(player);
        this.channel.sendTo(new JoinGameS2CPacket(player.getId()), clientId);

        console.log(`Player ${packet.clientId} Login`);
    }

    public onPlayerFinishLogin(packet: PlayerFinishLoginC2SPacket) {
        const uuid: UUID = packet.uuid;
        const player = this.world.getEntity(uuid);
        if (!player || !this.uuidToPlayer.has(uuid)) return;

        this.channel.sendTo(EntityNbtS2CPacket.create(player), uuid);

        const entities = this.world.getEntities().values();
        this.channel.sendTo(EntityBatchSpawnS2CPacket.create(entities), uuid);
    }

    public onPlayerDisconnect(packet: PlayerDisconnectC2SPacket) {
        const uuid: UUID = packet.uuid;
        if (!this.uuidToPlayer.has(uuid)) {
            return;
        }

        const player = this.world.getEntity(uuid);
        if (!player || !player.isPlayer()) return;

        this.world.removePlayer(player as ServerPlayerEntity);
        this.uuidToPlayer.delete(uuid);
        this.channel.send(new PlayerDisconnectS2CPacket(uuid, 'Logout'));

        console.log(`Player disconnected with uuid: ${uuid}`);
    }

    public onPlayerAim(packet: PlayerAimC2SPacket) {
        const player = this.world.getEntity(packet.uuid);
        if (!player) return;

        const pointer = packet.aim;
        const posRef = player.getPositionRef;
        player.setClampYaw(Math.atan2(
            pointer.y - posRef.y,
            pointer.x - posRef.x
        ), 0.3926875);
    }

    public onPlayerMove(packet: PlayerMoveC2SPacket | PlayerMoveByPointerC2SPacket) {
        const uuid: UUID = packet.uuid;

        const player = this.world.getEntity(uuid);
        if (!player || !player.isPlayer()) return;

        const speedMultiplier = player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        const speed = player.getMovementSpeed() * speedMultiplier;
        player.updateVelocity(speed, packet.dx, packet.dy);
    }

    public onPlayerInput(packet: PlayerInputC2SPacket): void {
        const uuid: UUID = packet.uuid;
        const key = packet.key;

        const player = this.world.getEntity(uuid) as ServerPlayerEntity | null;
        if (!player || !player.isPlayer()) return;
        player.handlerInput(key);
    }

    public onPlayerSwitchSlot(packet: PlayerSwitchSlotC2SPacket): void {
        const uuid: UUID = packet.uuid;
        const slot = packet.slot;

        const player = this.world.getEntity(uuid);
        if (!player || !player.isPlayer()) return;

        (player as ServerPlayerEntity).setCurrentItem(slot);
    }

    public onPlayerFire(packet: PlayerFireC2SPacket): void {
        const uuid = packet.uuid;
        const start = packet.start;

        const player = this.world.getEntity(uuid) as ServerPlayerEntity | null;
        if (!player || !player.isPlayer()) return;
        player.setFiring(start);
    }

    public onUnlockTech(packet: PlayerUnlockTechC2SPacket): void {
        const uuid: UUID = packet.uuid;
        const name = packet.techName;

        const player = this.world.getEntity(uuid) as ServerPlayerEntity | null;
        if (!player || !player.isPlayer()) return;

        applyServerTech(name, player);
        player.techTree.unlock(name);
    }

    public onTechRest(packet: PlayerTechResetC2SPacket): void {
        const player = this.world.getEntity(packet.uuid);
        if (!player || !player.isPlayer()) return;

        player.techTree.resetTech();
    }

    public onRequestPosition(packet: RequestPositionC2SPacket): void {
        const uuid: UUID = packet.playerId;
        const player = this.world.getEntity(uuid) as ServerPlayerEntity | null;
        if (!player) return;

        this.channel.sendTo(EntityPositionForceS2CPacket.create(player), packet.playerId);
    }

    public onCommandExecution(packet: CommandExecutionC2SPacket): void {
        if (this.validateMessage(packet.command, packet.uuid)) {
            const player = this.world.getEntity(packet.uuid);
            if (!player || !player.isPlayer()) return;

            this.executeCommand(packet.command, player.getCommandSource());
        }
    }

    private executeCommand(command: string, source: ServerCommandSource): void {
        const result = this.parse(command, source);
        this.server.serverCommandManager.execute(result, command);
    }

    private parse(command: string, source: ServerCommandSource): ParseResults<ServerCommandSource> {
        const dispatcher = this.server.serverCommandManager.getDispatcher();
        return dispatcher.parse(command, source);
    }

    private validateMessage(command: string, target: UUID): boolean {
        if (ServerPlayNetworkHandler.hasIllegalCharacter(command)) {
            this.disconnect(target, 'Illegal Character');
            return false;
        }

        return true;
    }

    private static hasIllegalCharacter(message: string): boolean {
        for (let i = 0; i < message.length; i++) {
            const c = message.charCodeAt(i);
            if (c != 167 && c >= 32 && c != 127) continue;
            return true;
        }

        return false;
    }

    public getPlayerByUUID(uuid: UUID) {
        return this.uuidToPlayer.get(uuid) ?? null;
    }

    public getPlayerBySessionId(id: number) {
        return this.sessionIdToPlayer.get(id) ?? null;
    }

    public registryHandler() {
        new PacketHandlerBuilder()
            .add(RelayServerPacket.ID, this.onRelayServer)
            .add(PlayerAttemptLoginC2SPacket.ID, this.onPlayerAttemptLogin)
            .add(PlayerFinishLoginC2SPacket.ID, this.onPlayerFinishLogin)
            .add(PlayerDisconnectC2SPacket.ID, this.onPlayerDisconnect)
            .add(PlayerAimC2SPacket.ID, this.onPlayerAim)
            .add(PlayerMoveC2SPacket.ID, this.onPlayerMove)
            .add(PlayerMoveByPointerC2SPacket.ID, this.onPlayerMove)
            .add(PlayerInputC2SPacket.ID, this.onPlayerInput)
            .add(PlayerSwitchSlotC2SPacket.ID, this.onPlayerSwitchSlot)
            .add(PlayerFireC2SPacket.ID, this.onPlayerFire)
            .add(PlayerUnlockTechC2SPacket.ID, this.onUnlockTech)
            .add(PlayerTechResetC2SPacket.ID, this.onTechRest)
            .add(RequestPositionC2SPacket.ID, this.onRequestPosition)
            .add(CommandExecutionC2SPacket.ID, this.onCommandExecution)
            .register(this.server.networkChannel, this);
    }
}