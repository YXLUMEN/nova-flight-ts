import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {SessionDispatcher} from "./SessionDispatcher.ts";
import type {ChannelHandler} from "../../network/channel/ChannelHandler.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Egress} from "./Egress.ts";
import {SessionChannel} from "./SessionChannel.ts";
import {ClientHandshakeC2SPacket} from "../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {ServerHandshakeHandler} from "./handler/ServerHandshakeHandler.ts";
import {Log} from "../../worker/log.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {SocketAddr} from "../../network/SocketAddr.ts";
import {ServerIntegratedBus} from "./ServerIntegratedBus.ts";
import {HandshakeProtocols} from "../../network/protocol/HandshakeProtocols.ts";
import {ServerRelayHandler} from "./handler/ServerRelayHandler.ts";
import {NetHealthManager} from "./NetHealthManager.ts";

export class ServerNetworkManager implements SessionDispatcher, ChannelHandler {
    private readonly server: NovaFlightServer;
    private readonly bus: Egress;
    private readonly relayHandler: ServerRelayHandler;
    private readonly health: NetHealthManager;

    private readonly connections: Map<number, ServerConnection> = new Map();
    private readonly sidAddr: Map<number, SocketAddr> = new Map();

    public constructor(server: NovaFlightServer, bus: Egress) {
        this.server = server;
        this.bus = bus;
        this.relayHandler = new ServerRelayHandler(this);
        this.health = new NetHealthManager(bus);
    }

    public tick(): void {
        this.health.workload(this.connections.size);

        for (const conn of this.connections.values()) {
            if (conn.shouldRemove()) {
                conn.handlerDisconnection();
                conn.forceDisconnect();
                this.connections.delete(conn.sid);
                continue;
            }

            try {
                conn.tick();
            } catch (err) {
                if (conn.isHost) throw err;
                Log.warn(`Failed to handle packet for ${conn.sid}:\n  ${err}`);
                conn.disconnect('Server error');
            }
        }
        this.health.settle();
    }

    public dispatch(sid: number, reader: BinaryReader): void {
        const conn = this.connections.get(sid);
        if (conn) {
            conn.incoming(reader);
            return;
        }

        const channel = new SessionChannel(this.bus, sid);
        channel.setHandler(this);
        const payload = channel.directly(reader);
        if (payload instanceof ClientHandshakeC2SPacket) {
            const addr = this.bus instanceof ServerIntegratedBus ? SocketAddr.INTEGRATED : this.sidAddr.get(sid);
            if (!addr) {
                channel.disconnect();
                return;
            }

            const isHost = addr.host === '127.0.0.1' && this.server.isHostUUID(payload.clientId);
            const connection = new ServerConnection(addr, sid, payload.clientId, isHost, this.health.create());
            connection.channelActive(channel);

            const handshake = new ServerHandshakeHandler(this.server, connection);
            connection.setInbound(HandshakeProtocols.CLIENT_BOUND, handshake);
            connection.setOutBound(HandshakeProtocols.SERVER_BOUND);
            handshake.onClientHandshake(payload);

            this.connections.set(sid, connection);
            return;
        }

        channel.disconnect();
    }

    public relay(reader: BinaryReader): void {
        this.relayHandler.onMessage(reader);
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.iterPlayers()) {
            player.networkHandler.disconnect('network.disconnect.server_close');
        }
    }

    public close(): void {
        this.disconnectAllPlayer();
    }

    public permit(sid: number, addr: string): void {
        this.expired(sid);
        const socket = SocketAddr.from(addr);
        if (!socket) {
            // 理论上不会出现
            Log.warn(`Can not parse address: "${addr}"`);
            this.bus.action(RelayActionBuilder.forceDisconnect(sid));
            return;
        }

        if (this.health.tooFrequent(socket.host)) {
            this.bus.action(RelayActionBuilder.forceDisconnect(sid));
            return;
        }
        this.sidAddr.set(sid, socket);
        this.bus.action(RelayActionBuilder.allowTraffic(sid));
    }

    public detach(sid: number): void {
        this.expired(sid);
        this.sidAddr.delete(sid);
    }

    private expired(sid: number) {
        const conn = this.connections.get(sid);
        if (!conn) return;
        conn.handlerDisconnection();
        this.connections.delete(sid);
    }

    public recv(): void {
    }

    public report(err: unknown): void {
        Log.error(`Error occurrence when init a channel:\n  ${err}`);
    }
}
