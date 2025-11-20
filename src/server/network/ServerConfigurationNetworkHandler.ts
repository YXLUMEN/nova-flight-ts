import {ServerCommonNetworkHandler} from "./ServerCommonNetworkHandler.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {UUID} from "../../apis/types.ts";
import {GameProfile} from "../entity/GameProfile.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {ServerNetworkChannel} from "./ServerNetworkChannel.ts";
import {ServerPlayNetworkHandler} from "./ServerPlayNetworkHandler.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {ServerPlayerEntity} from "../entity/ServerPlayerEntity.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";

export class ServerConfigurationNetworkHandler extends ServerCommonNetworkHandler {
    private readonly profile: GameProfile;
    private readonly networkHandlers = new Map<number, ServerCommonNetworkHandler>();

    public constructor(server: NovaFlightServer, channel: ServerNetworkChannel, profile: GameProfile) {
        super(server, channel);
        this.profile = profile;

        channel.setHandler(payload => {
            const handler = this.networkHandlers.get(payload.sessionId);
            if (handler) {
                handler.handlePayload(payload.payload);
            } else {
                this.handlePayload(payload.payload);
            }
        });
        this.registryHandler();
    }

    private onRelayServer(packet: RelayServerPacket) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
    }

    private onClientSniff(packet: ClientSniffingC2SPacket) {
        if (!this.server.world) return;
        this.server.networkChannel.sendTo(new ServerReadyS2CPacket(), packet.clientId);
    }

    private async onPlayerAttemptLogin(packet: PlayerAttemptLoginC2SPacket): Promise<void> {
        const clientId: UUID = packet.clientId;
        const manager = this.server.playerManager;

        if (manager.isPlayerExists(clientId)) {
            console.warn(`A duplicate player try to login with id ${clientId}`);
            return;
        }

        const playerProfile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
        const success = manager.addPlayer(playerProfile);
        if (!success) {
            console.warn(`Fail to login a player with id ${clientId}, check if id is duplicated`);
            return;
        }

        const world = this.server.world;
        const channel = this.server.networkChannel;

        const player = new ServerPlayerEntity(world, playerProfile);
        const playerData = manager.loadPlayerData(player);
        if (playerData.isPresent()) {
            player.readNBT(playerData.get());
        }
        player.setUuid(clientId);

        const networkHandler = new ServerPlayNetworkHandler(this.server, channel, player);
        networkHandler.send(new JoinGameS2CPacket(player.getId()));
        this.networkHandlers.set(playerProfile.sessionId, networkHandler);

        world.spawnPlayer(player);

        channel.send(new GameMessageS2CPacket(`\x1b[32m${playerProfile.name}\x1b[0m Join the game`));

        console.log(`Player ${packet.clientId} Login`);
    }

    private relayInfoHandler(_message: string): void {
    }

    public disconnectTarget(target: UUID, reason: string): void {
        this.channel.sendTo(new PlayerDisconnectS2CPacket(target, reason), target);
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.getAllProfile()) {
            this.disconnectTarget(player.clientId, 'ServerClose');
        }
    }

    protected override getProfile(): GameProfile {
        return this.profile;
    }

    private registryHandler() {
        this.register(RelayServerPacket.ID, this.onRelayServer.bind(this));
        this.register(ClientSniffingC2SPacket.ID, this.onClientSniff.bind(this));
        this.register(PlayerAttemptLoginC2SPacket.ID, this.onPlayerAttemptLogin.bind(this));
    }
}