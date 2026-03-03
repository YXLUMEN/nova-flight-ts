import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerDisconnectC2SPacket} from "../../network/packet/c2s/PlayerDisconnectC2SPacket.ts";
import {FullMove, PlayerMoveC2SPacket, PositionOnly, Steering} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {RequestPositionC2SPacket} from "../../network/packet/c2s/RequestPositionC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {PlayerResetAllTechC2SPacket} from "../../network/packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import type {ParseResults} from "../../brigadier/ParseResults.ts";
import type {ServerCommandSource} from "../command/ServerCommandSource.ts";
import {GameProfile} from "../entity/GameProfile.ts";
import {ServerCommonHandler} from "./ServerCommonHandler.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {ChatMessageC2SPacket} from "../../network/packet/c2s/ChatMessageC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import type {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PlayerResetTechC2SPacket} from "../../network/packet/c2s/PlayerResetTechC2SPacket.ts";
import {ApplyServerTech} from "../tech/ApplyServerTech.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {PingC2SPacket} from "../../network/packet/c2s/PingC2SPacket.ts";
import type {ServerConnection} from "./ServerConnection.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {ConnectionState, type ConnectionStateType} from "./ConnectionState.ts";

export class ServerStableSession extends ServerCommonHandler {
    public readonly player: ServerPlayerEntity;
    private readonly world: ServerWorld;

    private messageCooldown: number = 0;
    private canMove = true;

    public constructor(server: NovaFlightServer, connection: ServerConnection, player: ServerPlayerEntity) {
        super(server, connection);

        this.player = player;
        player.session = this;

        this.world = server.world!;
        this.registryHandler();
    }

    public tick(): void {
        if (!this.isHost()) {
            this.connection.checkActivate();
        }

        if (this.messageCooldown > 0) this.messageCooldown--;
        this.canMove = true;
    }

    protected override getProfile(): GameProfile {
        return this.player.getProfile();
    }

    public onPlayerFinishLogin(_: PlayerFinishLoginC2SPacket) {
        const uuid: UUID = this.getProfile().clientId;
        if (!this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        this.send(EntityNbtS2CPacket.create(this.player));
        /**
         * - [Header][SessionId][Target] 3B
         * - PayloadType index default at 13, varUint 1B
         * - Batch count varUint (max 3B)
         * - Reserve 7B for safe
         *
         * Total: 3 + 1 + 3 +7 = 14B
         * */
        const maxSize = NetworkChannel.MAX_PACKET_SIZE - 14;

        let currentSize = 0;
        const currentBatch: EntitySpawnS2CPacket[] = [];
        const entities = this.world.getEntities().values();
        for (const entity of entities) {
            const spawnPacket = EntitySpawnS2CPacket.create(entity);
            const estSize = spawnPacket.estimateSize();

            if (currentSize + estSize >= maxSize && currentBatch.length > 0) {
                this.send(new EntityBatchSpawnS2CPacket(currentBatch));
                currentBatch.length = 0;
                currentSize = 0;
                continue;
            }
            currentBatch.push(spawnPacket);
            currentSize += estSize;
        }

        if (currentBatch.length > 0) {
            this.send(new EntityBatchSpawnS2CPacket(currentBatch));
        }
    }

    public override forceDisconnect() {
        if (this.connection.shouldRemove()) return;

        super.forceDisconnect();
        this.onPlayerDisconnect().then();
    }

    public async onPlayerDisconnect() {
        const uuid: UUID = this.getProfile().clientId;
        if (!this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        this.send(new PlayerDisconnectS2CPacket(uuid, ServerCommonHandler.LOGOUT));
        this.connection.changeState(ConnectionState.CLOSE);
        this.clear();

        await this.onDisconnected();
        if (this.isHost()) return;

        await this.server.playerManager.removePlayer(this.player);
        console.log(`Player disconnected with uuid: ${uuid}`);
    }

    public onPlayerMove(packet: PlayerMoveC2SPacket) {
        if (!this.canMove) return;
        this.canMove = false;

        if (packet.changePosition) {
            const speedMultiplier = this.player.getAttributeValue(EntityAttributes.GENERIC_MOVEMENT_SPEED);
            const speed = this.player.getMovementSpeed() * speedMultiplier;
            this.player.updateVelocity(speed, packet.dx, packet.dy);
        }

        if (packet.changeYaw) {
            this.player.setClampYaw(packet.yaw, 0.3926875);
        }
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

    public onPlayerReload(): void {
        const stack = this.player.getCurrentItemStack();
        const item = stack.getItem() as BaseWeapon;
        item.onReload(this.player, stack);
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

    public onRequestPosition(_: RequestPositionC2SPacket): void {
        this.send(EntityPositionForceS2CPacket.create(this.player));
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
        if (ServerStableSession.hasIllegalCharacter(command)) {
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
        return ConnectionState.STABLE;
    }

    private bindSelf<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.register(id, handler.bind(this));
    }

    private registryHandler() {
        this.bindSelf(PingC2SPacket.ID, this.onPing);
        this.bindSelf(PlayerFinishLoginC2SPacket.ID, this.onPlayerFinishLogin);
        this.bindSelf(PlayerDisconnectC2SPacket.ID, this.onPlayerDisconnect);

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
        this.bindSelf(RequestPositionC2SPacket.ID, this.onRequestPosition);
        this.bindSelf(CommandExecutionC2SPacket.ID, this.onCommandExecution);
        this.bindSelf(ChatMessageC2SPacket.ID, this.onChatMessage);
        this.bindSelf(PlayerReloadC2SPacket.ID, this.onPlayerReload);
    }
}