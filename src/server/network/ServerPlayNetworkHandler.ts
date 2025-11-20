import type {NovaFlightServer} from "../NovaFlightServer.ts";
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
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {PlayerTechResetC2SPacket} from "../../network/packet/c2s/PlayerTechResetC2SPacket.ts";
import {PlayerMoveByPointerC2SPacket} from "../../network/packet/c2s/PlayerMoveByPointerC2SPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import type {ParseResults} from "../../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../command/ServerCommandSource.ts";
import {GameProfile} from "../entity/GameProfile.ts";
import {ServerCommonNetworkHandler} from "./ServerCommonNetworkHandler.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ChatMessageC2SPacket} from "../../network/packet/c2s/ChatMessageC2SPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";

export class ServerPlayNetworkHandler extends ServerCommonNetworkHandler {
    public readonly player: ServerPlayerEntity;
    private readonly world: ServerWorld;
    private readonly clientId: UUID;

    private messageCooldown: number = 0;

    private lastTickX!: number;
    private lastTickY!: number;

    public constructor(server: NovaFlightServer, channel: ServerNetworkChannel, player: ServerPlayerEntity) {
        super(server, channel);

        this.player = player;
        player.networkHandler = this;

        this.world = server.world;
        this.clientId = player.getProfile().clientId;
        this.syncWithPlayerPosition();
        this.registryHandler();
    }

    public tick(): void {
        this.syncWithPlayerPosition();
        this.player.prevX = this.player.getX();
        this.player.prevY = this.player.getY();
        this.player.updatePosition(this.lastTickX, this.lastTickY);
        this.player.updateYaw(this.player.getYaw());

        this.baseTick();
        if (this.messageCooldown > 0) {
            this.messageCooldown--;
        }
    }

    private syncWithPlayerPosition() {
        this.lastTickX = this.player.getX();
        this.lastTickY = this.player.getY();
    }

    protected override getProfile(): GameProfile {
        return this.player.getProfile();
    }

    public onPlayerFinishLogin(_: PlayerFinishLoginC2SPacket) {
        const uuid: UUID = this.clientId;
        if (this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        this.channel.sendTo(EntityNbtS2CPacket.create(this.player), uuid);

        const entities = this.world.getEntities().values();
        this.channel.sendTo(EntityBatchSpawnS2CPacket.create(entities), uuid);
    }

    public onPlayerDisconnect(_: PlayerDisconnectC2SPacket) {
        const uuid: UUID = this.clientId;
        if (!this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        this.world.removePlayer(this.player);
        this.server.playerManager.removePlayer(uuid);
        this.channel.send(new PlayerDisconnectS2CPacket(uuid, 'Logout'));

        console.log(`Player disconnected with uuid: ${uuid}`);
    }

    public onPlayerAim(packet: PlayerAimC2SPacket) {
        const pointer = packet.aim;
        const posRef = this.player.getPositionRef;
        this.player.setClampYaw(Math.atan2(
            pointer.y - posRef.y,
            pointer.x - posRef.x
        ), 0.3926875);
    }

    public onPlayerMove(packet: PlayerMoveC2SPacket | PlayerMoveByPointerC2SPacket) {
        const speedMultiplier = this.player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
        const speed = this.player.getMovementSpeed() * speedMultiplier;
        this.player.updateVelocity(speed, packet.dx, packet.dy);
    }

    public onPlayerInput(packet: PlayerInputC2SPacket): void {
        this.player.handlerInput(packet.key);
    }

    public onPlayerSwitchSlot(packet: PlayerSwitchSlotC2SPacket): void {
        this.player.setCurrentItem(packet.slot);
    }

    public onPlayerFire(packet: PlayerFireC2SPacket): void {
        this.player.setFiring(packet.start);
    }

    public onUnlockTech(packet: PlayerUnlockTechC2SPacket): void {
        const name = packet.techName;

        applyServerTech(name, this.player);
        this.player.techTree.unlock(name);
    }

    public onTechRest(_: PlayerTechResetC2SPacket): void {
        this.player.techTree.resetTech();
    }

    public onRequestPosition(_: RequestPositionC2SPacket): void {
        this.channel.sendTo(EntityPositionForceS2CPacket.create(this.player), this.player.getUUID());
    }

    public onCommandExecution(packet: CommandExecutionC2SPacket): void {
        if (this.validateMessage(packet.command)) {
            this.executeCommand(packet.command, this.player.getCommandSource());
        }
    }

    public onChatMessage(packet: ChatMessageC2SPacket): void {
        const message = packet.msg;
        if (message.length > 64) return;
        const name = this.getProfile().name;

        this.channel.send(new GameMessageS2CPacket(`[${name}] ${message}`));
    }

    private executeCommand(command: string, source: ServerCommandSource): void {
        const result = this.parse(command, source);
        this.server.serverCommandManager.execute(result, command);
    }

    private parse(command: string, source: ServerCommandSource): ParseResults<ServerCommandSource> {
        const dispatcher = this.server.serverCommandManager.getDispatcher();
        return dispatcher.parse(command, source);
    }

    private validateMessage(command: string): boolean {
        if (ServerPlayNetworkHandler.hasIllegalCharacter(command)) {
            this.disconnect('Illegal Character');
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

    private registryHandler() {
        this.register(PlayerFinishLoginC2SPacket.ID, this.onPlayerFinishLogin.bind(this));
        this.register(PlayerDisconnectC2SPacket.ID, this.onPlayerDisconnect.bind(this));
        this.register(PlayerAimC2SPacket.ID, this.onPlayerAim.bind(this));
        this.register(PlayerMoveC2SPacket.ID, this.onPlayerMove.bind(this));
        this.register(PlayerMoveByPointerC2SPacket.ID, this.onPlayerMove.bind(this));
        this.register(PlayerInputC2SPacket.ID, this.onPlayerInput.bind(this));
        this.register(PlayerSwitchSlotC2SPacket.ID, this.onPlayerSwitchSlot.bind(this));
        this.register(PlayerFireC2SPacket.ID, this.onPlayerFire.bind(this));
        this.register(PlayerUnlockTechC2SPacket.ID, this.onUnlockTech.bind(this));
        this.register(PlayerTechResetC2SPacket.ID, this.onTechRest.bind(this));
        this.register(RequestPositionC2SPacket.ID, this.onRequestPosition.bind(this));
        this.register(CommandExecutionC2SPacket.ID, this.onCommandExecution.bind(this));
        this.register(ChatMessageC2SPacket.ID, this.onChatMessage.bind(this));
    }
}