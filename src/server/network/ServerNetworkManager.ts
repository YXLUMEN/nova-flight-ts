import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Payload} from "../../network/Payload.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {ServerConfigHandler} from "./handler/ServerConfigHandler.ts";
import {ClientReadyC2SPacket} from "../../network/packet/c2s/ClientReadyC2SPacket.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {Log} from "../../worker/log.ts";
import {ConnectionState, type ConnectionStateType} from "./ConnectionState.ts";
import {RelayMessage} from "../../network/packet/relay/RelayMessage.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {ClientAttached} from "../../network/packet/relay/ClientAttached.ts";
import {Detached} from "../../network/packet/relay/Detached.ts";
import type {PacketListener} from "./handler/PacketListener.ts";

export class ServerNetworkManager implements PacketListener {
    public static readonly SERVER_CLOSE = TranslatableText.of('network.disconnect.server_close');

    private readonly server: NovaFlightServer;
    private readonly connections = new Map<number, ServerConnection>();

    public constructor(server: NovaFlightServer) {
        this.server = server;

        this.server.networkChannel.setHandler(this.onReceive.bind(this));
    }

    public onRelayMessage(packet: RelayMessage) {
        const parts = packet.msg.split(':');
        const type = parts[0];
        const msg = parts.slice(1).join(':');
        console.log(type, msg);
    }

    public onDetached(packet: Detached) {
        const conn = this.connections.get(packet.sessionId);
        if (conn) this.removeConnection(conn);
    }

    public onClientAttached(packet: ClientAttached) {
        // 触发则代表新客户端,踢掉旧连接
        const id = packet.sessionId;
        const conn = this.connections.get(id);
        if (conn) this.removeConnection(conn);

        this.permit(id);
    }

    public tick(): void {
        for (const [id, conn] of this.connections) {
            if (conn.shouldRemove()) {
                this.removeConnection(conn);
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

    private removeConnection(conn: ServerConnection) {
        conn.handlerDisconnection();
        this.connections.delete(conn.getId());
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.getAllPlayers()) {
            player.networkHandler.disconnect(ServerNetworkManager.SERVER_CLOSE);
        }
    }

    private onReceive(sessionId: number, packet: Payload) {
        if (sessionId === 0) {
            packet.accept(this);
            return;
        }

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

        // 悬挂连接
        this.server.networkChannel.action(RelayActionBuilder.forceDisconnect(sessionId));
    }

    private permit(sessionId: number) {
        this.server.networkChannel.action(RelayActionBuilder.allowTraffic(sessionId));
    }

    public onDisconnected(): void {
    }

    public accepts(): void {
    }

    public getPhase(): ConnectionStateType {
        return ConnectionState.CONFIGURATION;
    }

    public clear(): void {
    }
}