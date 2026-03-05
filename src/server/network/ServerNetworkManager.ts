import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import type {Consumer} from "../../apis/types.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import type {Identifier} from "../../registry/Identifier.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ServerConfigHandler} from "./handler/ServerConfigHandler.ts";
import {ClientReadyC2SPacket} from "../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {Log} from "../../worker/log.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";

export class ServerNetworkManager {
    public static readonly PENDING_TIMEOUT = 5000;
    public static readonly SERVER_CLOSE = TranslatableText.of('network.disconnect.server_close');

    private readonly server: NovaFlightServer;
    private readonly connections = new Map<number, ServerConnection>();
    private readonly globals = new HashMap<Identifier, Consumer<Payload>>();

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.registryHandler();
        this.server.networkChannel.setHandler(this.onReceive.bind(this));
    }

    private onRelayServer(packet: RelayServerPacket) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');
        if (type === 'INFO') {
            this.onRelayInfo(msg);
        }
    }

    private onRelayInfo(msg: string) {
        const parts = msg.split(':');
        const type = parts.shift();

        if (type === 'CLIENT_REGISTERED') this.onRegistry(parts);
    }

    private onRegistry(args: string[]) {
        const sessionId = Number(args[0]);
        if (!Number.isSafeInteger(sessionId)) {
            Log.error(`Received invalid sessionId ${sessionId} from Relay server`);
            return;
        }

        const conn = this.connections.get(sessionId);
        if (conn) {
            conn.forceDisconnect();
            this.connections.delete(sessionId);
        }

        this.allowTraffic(sessionId);
    }

    public tick(): void {
        for (const [id, conn] of this.connections) {
            if (conn.shouldRemove()) {
                conn.forceDisconnect();
                this.connections.delete(id);
                continue;
            }

            try {
                conn.tick();
            } catch (err) {
                if (conn.isHost()) throw err;
                Log.warn(`Failed to handle packet for ${id}`);
                conn.disconnect(TranslatableText.of('Internal server error'));
            }
        }
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.getAllPlayers()) {
            player.networkHandler.disconnect(ServerNetworkManager.SERVER_CLOSE);
        }
    }

    private onReceive(sessionId: number, packet: Payload) {
        const conn = this.connections.get(sessionId);
        if (conn) {
            conn.recv(packet);
            return;
        }

        // negotiation
        if (packet instanceof ClientReadyC2SPacket) {
            const isHost = this.server.isHostUUID(packet.clientId);

            const connection = new ServerConnection(this.server.networkChannel, sessionId, packet.clientId, isHost);
            const config = new ServerConfigHandler(this.server, connection);
            connection.setPacketListener(ConnectionState.CONFIGURATION, config);
            config.onClientReady(packet);

            this.connections.set(sessionId, connection);
            return;
        }

        this.globals.get(packet.getId().id)?.(packet);
    }

    private register<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.globals.set(id.id, handler.bind(this) as Consumer<Payload>);
    }

    private registryHandler() {
        this.register(RelayServerPacket.ID, this.onRelayServer);
    }

    private allowTraffic(sessionId: number) {
        const writer = new BinaryWriter();
        writer.writeInt8(0xFF);
        writer.writeInt8(0x01);
        writer.writeInt8(sessionId);
        this.server.networkChannel.action(writer.toUint8Array());
    }
}