import type {NovaFlightServer} from "../../NovaFlightServer.ts";
import {PlayerFinishLoginC2SPacket} from "../../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {
    FullMove,
    PlayerMoveC2SPacket,
    PositionOnly,
    Steering
} from "../../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {ServerPlayerEntity} from "../../entity/ServerPlayerEntity.ts";
import type {Consumer, UUID} from "../../../type/types.ts";
import {PlayerFireC2SPacket} from "../../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {PlayerResetAllTechC2SPacket} from "../../../network/packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {CommandExecutionC2SPacket} from "../../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import type {ParseResults} from "../../../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../../command/ServerCommandSource.ts";
import {GameProfile} from "../../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import type {ServerWorld} from "../../ServerWorld.ts";
import {ChatMessageC2SPacket} from "../../../network/packet/c2s/ChatMessageC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import {BaseWeapon} from "../../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {EntitySpawnS2CPacket} from "../../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {PlayerResetTechC2SPacket} from "../../../network/packet/c2s/PlayerResetTechC2SPacket.ts";
import {ApplyServerTech} from "../../tech/ApplyServerTech.ts";
import {EntityAttributes} from "../../../entity/attribute/EntityAttributes.ts";
import {GameMessageS2CPacket} from "../../../network/packet/s2c/GameMessageS2CPacket.ts";
import {PingC2SPacket} from "../../../network/packet/c2s/PingC2SPacket.ts";
import type {ServerConnection} from "../ServerConnection.ts";
import type {Payload, PayloadId} from "../../../network/Payload.ts";
import {ConnectionState, type ConnectionStateType} from "../ConnectionState.ts";
import {BlockChangeC2SPacket} from "../../../network/packet/c2s/BlockChangeC2SPacket.ts";
import {BlockChangeS2CPacket} from "../../../network/packet/s2c/BlockChangeS2CPacket.ts";
import {World} from "../../../world/World.ts";
import {BatchBlockChangesPacket} from "../../../network/packet/BatchBlockChangesPacket.ts";
import {FireSpecialC2SPacket} from "../../../network/packet/c2s/FireSpecialC2SPacket.ts";
import {PlayerInventorySwapC2SPacket} from "../../../network/packet/c2s/PlayerInventorySwapC2SPacket.ts";
import {SetPlayerInventoryS2CPacket} from "../../../network/packet/s2c/SetPlayerInventoryPacket.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import {PositionMoveRotation} from "../../../network/packet/PositionMoveRotation.ts";
import {PlayerPositionS2CPacket} from "../../../network/packet/s2c/PlayerPositionS2CPacket.ts";
import {RequestTeleportC2SPacket} from "../../../network/packet/c2s/RequestTeleportC2SPacket.ts";

export class ServerPlayHandler extends ServerCommonHandler {
    public readonly player: ServerPlayerEntity;
    private readonly world: ServerWorld;

    private awaitingTeleport: number = 0;
    private messageCooldown: number = 0;
    private moveTimes: number = 0;

    public constructor(server: NovaFlightServer, connection: ServerConnection, player: ServerPlayerEntity) {
        super(server, connection);

        this.player = player;
        player.networkHandler = this;

        this.world = server.world!;
        this.registryHandler();
    }

    public tick(): void {
        if (!this.isHost()) {
            this.connection.checkActivate();
        }

        if (this.messageCooldown > 0) this.messageCooldown--;
        this.moveTimes = 0;
    }

    protected override getProfile(): GameProfile {
        return this.player.getProfile();
    }

    public override onDisconnected() {
        const profile = this.getProfile();

        this.broadcast(new GameMessageS2CPacket(`\x1b[32m${profile.name}\x1b[0m leave the game`));
        this.server.playerManager.removePlayer(this.player);
        super.onDisconnected();
    }

    public onPlayerFinishLogin(_: PlayerFinishLoginC2SPacket) {
        const uuid: UUID = this.getProfile().clientId;
        if (!this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        this.send(EntityNbtS2CPacket.create(this.player));
        const entities = this.world.getEntities().values();
        ServerCommonHandler.buildBatch(entities, EntitySpawnS2CPacket.create, EntityBatchSpawnS2CPacket.new)
            .forEach(packet => this.send(packet));

        const blocks = this.world.getMap().getNonAirBlocksGen();
        ServerCommonHandler.buildBatchWithEst(blocks, () => 9, BatchBlockChangesPacket.from)
            .forEach(packet => this.send(packet));
    }

    public override forceDisconnect() {
        if (this.connection.shouldRemove()) return;
        super.forceDisconnect();
    }

    public onPlayerMove(packet: PlayerMoveC2SPacket) {
        if (this.moveTimes > 1) {
            console.warn(`[Server] Player ${this.player.getProfile().name} move too fast`);
            if (this.moveTimes > 3) {
                this.teleport(this.player.getX(), this.player.getY(), this.player.getYaw());
                return;
            }
        }
        this.moveTimes++

        if (packet.changePosition) {
            const speedMultiplier = this.player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.player.getMovementSpeed() * speedMultiplier;
            this.player.updateVelocity(speed, packet.dx, packet.dy);
        }

        if (packet.changeYaw) {
            this.player.setClampYaw(packet.yaw, 0.3926875);
        }
    }

    public teleport(x: number, y: number, yaw: number) {
        if (++this.awaitingTeleport === 65535) {
            this.awaitingTeleport = 0;
        }

        const change = new PositionMoveRotation(new Vec2(x, y), Vec2.ZERO, yaw);
        this.send(new PlayerPositionS2CPacket(this.awaitingTeleport, change));
    }

    public onRequestTeleport() {
        this.teleport(this.player.getX(), this.player.getY(), this.player.getYaw());
    }

    public onPlayerInput(packet: PlayerInputC2SPacket): void {
        this.player.handlerInput(packet.key);
    }

    public onPlayerSwitchSlot(packet: PlayerSwitchSlotC2SPacket): void {
        this.player.setCurrentItem(packet.slot);
    }

    public onPlayerInventorySwap(packet: PlayerInventorySwapC2SPacket): void {
        const inventory = this.player.getInventory();
        if (!inventory.validateSlot(packet.from) || !inventory.validateSlot(packet.to)) {
            return;
        }

        const itemA = inventory.getItem(packet.from);
        const itemB = inventory.getItem(packet.to);
        inventory.setItem(packet.to, itemA);
        inventory.setItem(packet.from, itemB);

        this.send(new SetPlayerInventoryS2CPacket(packet.to, itemA));
        this.send(new SetPlayerInventoryS2CPacket(packet.from, itemB));
    }

    public onPlayerFire(packet: PlayerFireC2SPacket): void {
        this.player.setFiring(packet.start);
    }

    public onPlayerFireSpecial(packet: FireSpecialC2SPacket): void {
        this.player.fireSpecials(packet.item);
    }

    public onPlayerReload(): void {
        const stack = this.player.getCurrentItem();
        const item = stack.getItem();
        if (item instanceof BaseWeapon) {
            item.onReload(this.player, stack);
        }
    }

    public onUnlockTech(packet: PlayerUnlockTechC2SPacket): void {
        if (this.player.getTechs().unlock(packet.tech)) {
            ApplyServerTech.apply(packet.tech, this.player);
        }
    }

    public onAllTechRest(_: PlayerResetAllTechC2SPacket): void {
        this.player.getTechs().resetAllTech();
    }

    public onTechRest(packet: PlayerResetTechC2SPacket): void {
        this.player.getTechs().resetTech(packet.entry);
    }

    public onPlaceBlock(packet: BlockChangeC2SPacket): void {
        if (packet.x < 0 || packet.x > World.WORLD_W ||
            packet.y < 0 || packet.y > World.WORLD_H) {
            this.send(new BlockChangeS2CPacket(0, packet.x, packet.y));
            return;
        }

        this.world.getMap().set(packet.x, packet.y, packet.type);
        this.broadcast(new BlockChangeS2CPacket(packet.type, packet.x, packet.y));
    }

    public onBatchPlace(packet: BatchBlockChangesPacket): void {
        const map = this.world.getMap();
        const changes = packet
            .filter((_, x, y) => x > 0 ||
                x < World.WORLD_W ||
                y > 0 ||
                y < World.WORLD_H
            );
        changes.foreach((type, x, y) => map.set(x, y, type));
        this.broadcast(changes);
    }

    public onCommandExecution(packet: CommandExecutionC2SPacket): void {
        if (this.validateMessage(packet.command)) {
            this.executeCommand(packet.command, this.player.getCommandSource());
            this.checkForSpam();
        }
    }

    private checkForSpam() {
        this.messageCooldown += 20;
        if (this.messageCooldown > 200 && !this.isHost()) {
            this.forceDisconnect();
        }
    }

    public onChatMessage(packet: ChatMessageC2SPacket): void {
        const message = packet.msg;
        if (message.length <= 64) {
            const name = this.getProfile().name;
            this.broadcast(new GameMessageS2CPacket(`[${name}] ${message}`));
        }
        this.checkForSpam();
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
        if (ServerPlayHandler.hasIllegalCharacter(command)) {
            this.disconnect(ServerCommonHandler.ILLEGAL_CHARACTER);
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

    public getPhase(): ConnectionStateType {
        return ConnectionState.PLAY;
    }

    private bindSelf<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.register(id, handler.bind(this));
    }

    private registryHandler() {
        this.bindSelf(PingC2SPacket.ID, this.onPing);
        this.bindSelf(PlayerFinishLoginC2SPacket.ID, this.onPlayerFinishLogin);
        const move = this.onPlayerMove.bind(this);
        this.register(FullMove.ID, move);
        this.register(PositionOnly.ID, move);
        this.register(Steering.ID, move);
        this.bindSelf(PlayerInputC2SPacket.ID, this.onPlayerInput);
        this.bindSelf(PlayerSwitchSlotC2SPacket.ID, this.onPlayerSwitchSlot);
        this.bindSelf(PlayerFireC2SPacket.ID, this.onPlayerFire);
        this.bindSelf(PlayerUnlockTechC2SPacket.ID, this.onUnlockTech);
        this.bindSelf(PlayerResetTechC2SPacket.ID, this.onTechRest);
        this.bindSelf(PlayerResetAllTechC2SPacket.ID, this.onAllTechRest);
        this.bindSelf(CommandExecutionC2SPacket.ID, this.onCommandExecution);
        this.bindSelf(ChatMessageC2SPacket.ID, this.onChatMessage);
        this.bindSelf(PlayerReloadC2SPacket.ID, this.onPlayerReload);
        this.bindSelf(BlockChangeC2SPacket.ID, this.onPlaceBlock);
        this.bindSelf(BatchBlockChangesPacket.ID, this.onBatchPlace);
        this.bindSelf(FireSpecialC2SPacket.ID, this.onPlayerFireSpecial);
        this.bindSelf(PlayerInventorySwapC2SPacket.ID, this.onPlayerInventorySwap);
        this.bindSelf(RequestTeleportC2SPacket.ID, this.onRequestTeleport);
    }
}