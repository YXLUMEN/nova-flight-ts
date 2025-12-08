import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerDisconnectC2SPacket} from "../../network/packet/c2s/PlayerDisconnectC2SPacket.ts";
import {PlayerYawC2SPacket} from "../../network/packet/c2s/PlayerYawC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {RequestPositionC2SPacket} from "../../network/packet/c2s/RequestPositionC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import type {UUID} from "../../apis/types.ts";
import {EntityAttributes} from "../../entity/attribute/EntityAttributes.ts";
import {applyServerTech} from "../tech/applyServerTech.ts";
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
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import type {BaseWeapon} from "../../item/weapon/BaseWeapon/BaseWeapon.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {NetworkChannel} from "../../network/NetworkChannel.ts";

export class ServerPlayNetworkHandler extends ServerCommonNetworkHandler {
    public readonly player: ServerPlayerEntity;
    private readonly world: ServerWorld;
    private readonly clientId: UUID;

    private messageCooldown: number = 0;

    private lastTickX: number = 0;
    private lastTickY: number = 0;

    public constructor(server: NovaFlightServer, channel: ServerNetworkChannel, player: ServerPlayerEntity) {
        super(server, channel);

        this.player = player;
        player.networkHandler = this;

        this.world = server.world!;
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

    public async onPlayerDisconnect(_: PlayerDisconnectC2SPacket) {
        const uuid: UUID = this.clientId;
        if (!this.server.playerManager.isPlayerExists(uuid)) {
            return;
        }

        await this.server.playerManager.removePlayer(this.player);
        this.channel.send(new PlayerDisconnectS2CPacket(uuid, 'Logout'));

        console.log(`Player disconnected with uuid: ${uuid}`);
    }

    public onPlayerAim(packet: PlayerYawC2SPacket) {
        this.player.setClampYaw(packet.yaw, 0.3926875);
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

    public onPlayerReload(): void {
        const stack = this.player.getCurrentItemStack();
        const item = stack.getItem() as BaseWeapon;
        item.onReload(this.player, stack);
    }

    public onUnlockTech(packet: PlayerUnlockTechC2SPacket): void {
        if (this.player.getTechs().unlock(packet.tech)) {
            applyServerTech(packet.tech, this.player);
        }
    }

    public onTechRest(_: PlayerTechResetC2SPacket): void {
        this.player.getTechs().resetTech();
    }

    public onRequestPosition(_: RequestPositionC2SPacket): void {
        this.send(EntityPositionForceS2CPacket.create(this.player));
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
        this.register(PlayerYawC2SPacket.ID, this.onPlayerAim.bind(this));
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
        this.register(PlayerReloadC2SPacket.ID, this.onPlayerReload.bind(this));
    }
}