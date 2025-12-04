import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import {ClientSniffingC2SPacket} from "../../network/packet/c2s/ClientSniffingC2SPacket.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import {GameProfile} from "../entity/GameProfile.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import type {PayloadWithOrigin} from "../../network/codec/PayloadWithOrigin.ts";

export class ServerNetworkHandler {
    private readonly server: NovaFlightServer;
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.registryHandler();
        this.server.networkChannel.setHandler(this.onReceive.bind(this));
    }

    private onRelayServer(packet: RelayServerPacket) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');

        if (type === 'INFO') this.relayInfoHandler(msg);
    }

    private onClientSniff(packet: ClientSniffingC2SPacket) {
        if (!this.server.world) return;
        this.server.networkChannel.sendToByUUID(new ServerReadyS2CPacket(), packet.clientId);
    }

    private async onPlayerConnect(packet: PlayerAttemptLoginC2SPacket) {
        try {
            const uuid: UUID = packet.clientId;
            const manager = this.server.playerManager;
            if (manager.isPlayerExists(uuid)) {
                console.warn(`A duplicate player try to login with id ${uuid}`);
                this.disconnectTarget(uuid, 'Duplicate Login');
                return;
            }

            const profile = new GameProfile(packet.sessionId, packet.clientId, packet.playerName);
            const player = manager.createPlayer(profile);
            await manager.onPlayerAttemptLogin(profile, player);
        } catch (err) {
            console.error(`Couldn't place player in world: ${err}`);
            this.disconnectTarget(packet.clientId, 'Duplicate Login');
        }
    }

    private relayInfoHandler(_message: string): void {
    }

    public disconnectTarget(target: UUID, reason: string): void {
        this.server.networkChannel.sendToByUUID(new PlayerDisconnectS2CPacket(target, reason), target);
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.getAllPlayers()) {
            player.networkHandler?.disconnect('ServerClose');
        }
    }

    private onReceive(payload: PayloadWithOrigin) {
        const player = this.server.playerManager.getPlayerBySessionId(payload.sessionId);
        if (player) {
            player.networkHandler?.handlePayload(payload.payload);
            return;
        }

        this.handlers.get(payload.payload.getId().id)?.(payload.payload);
    }

    private register<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.handlers.set(id.id, handler.bind(this) as Consumer<Payload>);
    }

    private registryHandler() {
        this.register(RelayServerPacket.ID, this.onRelayServer);
        this.register(ClientSniffingC2SPacket.ID, this.onClientSniff);
        this.register(PlayerAttemptLoginC2SPacket.ID, this.onPlayerConnect);
    }
}