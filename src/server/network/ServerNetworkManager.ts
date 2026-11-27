import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {SessionDispatcher} from "./SessionDispatcher.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Egress} from "./bus/Egress.ts";
import type {Payload} from "../../network/Payload.ts";
import {SessionChannel} from "./channel/SessionChannel.ts";
import {IntegratedChannel} from "./channel/IntegratedChannel.ts";
import {ClientHandshakeC2SPacket} from "../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {ServerHandshakeHandler} from "./handler/ServerHandshakeHandler.ts";
import {Log} from "../../utils/Log.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {SocketAddr} from "../../network/SocketAddr.ts";
import {ServerIntegratedBus} from "./bus/ServerIntegratedBus.ts";
import {HandshakeProtocols} from "../../network/protocol/HandshakeProtocols.ts";
import {ServerRelayHandler} from "./handler/ServerRelayHandler.ts";
import {NetHealthManager} from "./NetHealthManager.ts";

const STALL_MS = 125; // 50ms * 2.5

export class ServerNetworkManager implements SessionDispatcher {
    private readonly server: NovaFlightServer;
    private readonly bus: Egress;
    private readonly relayHandler: ServerRelayHandler;
    private readonly health: NetHealthManager;
    private readonly isIntegrated: boolean;

    private readonly connections: Map<number, ServerConnection> = new Map();
    private readonly bindAddress: Map<number, SocketAddr> = new Map();
    private lastTick = 0;

    public constructor(server: NovaFlightServer, bus: Egress) {
        this.server = server;
        this.bus = bus;
        this.relayHandler = new ServerRelayHandler(this);
        this.health = new NetHealthManager(bus);
        this.isIntegrated = this.bus instanceof ServerIntegratedBus;
    }

    public tick(): void {
        const now = performance.now();
        const gap = now - this.lastTick;
        this.lastTick = now;

        const stalled = gap > STALL_MS && gap < 1000;

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
        this.health.settle(stalled, gap);
    }

    public dispatch(sid: number, reader: BinaryReader): void {
        const conn = this.connections.get(sid);
        if (conn) {
            conn.incoming(reader);
            return;
        }
        this.open(sid, reader);
    }

    private open(sid: number, reader: BinaryReader) {
        let payload: Payload;

        try {
            payload = HandshakeProtocols.CLIENT_BOUND.codec.decode(reader);
        } catch (err) {
            Log.warn(`Error occurrence when open a channel:\n  ${err}`);
            this.kick(sid);
            return;
        }

        if (payload instanceof ClientHandshakeC2SPacket) {
            const addr = this.isIntegrated ? SocketAddr.INTEGRATED : this.bindAddress.get(sid);
            if (!addr) {
                this.kick(sid);
                return;
            }

            const isHost = addr.isLoopBack() && this.server.isHostUUID(payload.clientId);
            const channel = this.isIntegrated ? new IntegratedChannel(this.bus, sid) : new SessionChannel(this.bus, sid);
            const connection = new ServerConnection(addr, sid, payload.clientId, isHost, this.health.create());
            connection.channelActive(channel);

            const handshake = new ServerHandshakeHandler(this.server, connection);
            connection.setInbound(HandshakeProtocols.CLIENT_BOUND, handshake);
            connection.setOutBound(HandshakeProtocols.SERVER_BOUND);
            handshake.onClientHandshake(payload);

            this.connections.set(sid, connection);
            return;
        }

        // 连接悬挂
        this.kick(sid);
    }

    public relay(reader: BinaryReader): void {
        this.relayHandler.onMessage(reader);
    }

    public permit(token: number, host: string): void {
        if (this.health.tooFrequent(host)) {
            this.bus.action(RelayActionBuilder.reject(token));
            return;
        }
        this.bus.action(RelayActionBuilder.permit(token));
    }

    public active(sid: number, token: number, socket: SocketAddr) {
        this.expired(sid);
        this.bindAddress.set(sid, socket);
        this.bus.action(RelayActionBuilder.active_ack(sid, token));
    }

    public detach(sid: number): void {
        this.expired(sid);
        this.bindAddress.delete(sid);
    }

    private kick(sid: number) {
        this.bindAddress.delete(sid);
        this.bus.action(RelayActionBuilder.forceDisconnect(sid));
    }

    private expired(sid: number) {
        const conn = this.connections.get(sid);
        if (!conn) return;
        conn.handlerDisconnection();
        this.connections.delete(sid);
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.iterPlayers()) {
            player.networkHandler.disconnect('network.disconnect.server_close');
        }
    }

    public close(): void {
        this.disconnectAllPlayer();
    }
}
