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

export class ServerPlayNetworkHandler {
    private readonly server: NovaFlightServer;
    private readonly channel: ServerNetworkChannel;
    private readonly world: ServerWorld;
    public readonly loginPlayers: Set<UUID> = new Set<UUID>();

    public constructor(server: NovaFlightServer, world: ServerWorld) {
        this.server = server;
        this.world = world;
        this.channel = server.networkChannel;
    }

    public disconnectAllPlayer(): void {
        for (const player of this.loginPlayers) {
            this.channel.sendTo(new PlayerDisconnectS2CPacket(player, 'ServerClose'), player);
        }
    }

    public async onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket): Promise<void> {
        const clientId: UUID = packet.clientId;

        if (this.loginPlayers.has(clientId)) {
            console.warn(`Server attempted to add player prior to sending player info (Player id ${clientId})`);
            return;
        }

        const player = new ServerPlayerEntity(this.world);
        player.setUuid(clientId);
        this.world.spawnPlayer(player);
        this.channel.sendTo(new JoinGameS2CPacket(player.getId()), clientId);
        this.loginPlayers.add(clientId);

        console.log(`Player ${packet.clientId} Login`);
    }

    public onPlayerFinishLogin(packet: PlayerFinishLoginC2SPacket) {
        const uuid: UUID = packet.uuid;
        const player = this.world.getEntity(uuid);
        if (!player || !this.loginPlayers.has(uuid)) return;

        this.channel.sendTo(EntityNbtS2CPacket.create(player), uuid);

        const entities = this.world.getEntities().values();
        this.channel.sendTo(EntityBatchSpawnS2CPacket.create(entities), uuid);
    }

    public onPlayerDisconnect(packet: PlayerDisconnectC2SPacket) {
        const uuid: UUID = packet.uuid;
        if (!this.loginPlayers.has(uuid)) {
            return;
        }

        const player = this.world.getEntity(uuid);
        if (!player || !player.isPlayer()) return;

        this.world.removePlayer(player as ServerPlayerEntity);
        this.loginPlayers.delete(uuid);
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

    public registryHandler() {
        new PacketHandlerBuilder()
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
            .register(this.server.networkChannel, this);
    }
}