import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Payload} from "../../network/Payload.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {Log} from "../../worker/log.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {ServerRelayHandler} from "./handler/ServerRelayHandler.ts";
import {ServerHandshakeHandler} from "./handler/ServerHandshakeHandler.ts";
import {ClientHandshakeC2SPacket} from "../../network/packet/handshake/ClientHandshakeC2SPacket.ts";

export class ServerNetworkManager {
    public static readonly SERVER_CLOSE = TranslatableText.of('network.disconnect.server_close');

    private readonly server: NovaFlightServer;
    private readonly connections = new Map<number, ServerConnection>();
    private readonly relayHandler: ServerRelayHandler;
    private readonly flushTimer: number | undefined;

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.relayHandler = new ServerRelayHandler(this);
        this.server.networkChannel.setHandler(this.onReceive.bind(this));

        this.flushTimer = setInterval(() => this.server.networkChannel.flush(), 25);
    }

    public tick(): void {
        for (const conn of this.connections.values()) {
            if (conn.shouldRemove()) {
                this.removeConnection(conn);
                continue;
            }

            try {
                conn.tick();
            } catch (err) {
                if (conn.isHost()) throw err;
                Log.warn(`Failed to handle packet for ${conn.getId()}`);
                conn.disconnect(TranslatableText.of('Internal server error'));
            }
        }
    }

    public getConnection(sessionId: number): ServerConnection | undefined {
        return this.connections.get(sessionId);
    }

    public removeConnection(conn: ServerConnection): void {
        conn.handlerDisconnection();
        this.connections.delete(conn.getId());
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.getAllPlayers()) {
            player.networkHandler.disconnect(ServerNetworkManager.SERVER_CLOSE);
        }
    }

    private onReceive(sessionId: number, packet: Payload): void {
        if (sessionId === 0) {
            packet.accept(this.relayHandler);
            return;
        }

        const conn = this.connections.get(sessionId);
        if (conn) {
            conn.recv(packet);
            return;
        }

        // negotiation
        if (packet instanceof ClientHandshakeC2SPacket) {
            const isHost = this.server.isHostUUID(packet.clientId);

            const connection = new ServerConnection(this.server.networkChannel, sessionId, packet.clientId, isHost);
            const handshake = new ServerHandshakeHandler(this.server, connection);
            connection.setPacketListener(ConnectionState.HANDSHAKING, handshake);
            handshake.onClientHandshake(packet);

            this.connections.set(sessionId, connection);
            return;
        }

        // 悬挂连接
        this.server.networkChannel.action(RelayActionBuilder.forceDisconnect(sessionId));
    }

    public permit(sessionId: number): void {
        this.server.networkChannel.action(RelayActionBuilder.allowTraffic(sessionId));
    }

    public close(): void {
        this.disconnectAllPlayer();
        clearInterval(this.flushTimer);
    }
}