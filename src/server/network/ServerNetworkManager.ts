import type {NovaFlightServer} from "../NovaFlightServer.ts";
import type {Payload} from "../../network/Payload.ts";
import {ServerConnection} from "./ServerConnection.ts";
import {Log} from "../../worker/log.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {ServerRelayHandler} from "./handler/ServerRelayHandler.ts";
import {ServerHandshakeHandler} from "./handler/ServerHandshakeHandler.ts";
import {ClientHandshakeC2SPacket} from "../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ServerIntegratedChannel} from "./ServerIntegratedChannel.ts";
import {RateLimitError} from "../../type/errors.ts";
import {SocketAddr} from "../../network/SocketAddr.ts";

const SERVER_CLOSE = 'network.disconnect.server_close';
const SERVER_ERROR = 'Internal server error';
const PROTOCOL_ERROR = 'newtwork.disconnect.protocol_error';
const RATE_LIMIT = 'newtwork.disconnect.rate_limit';
const RATE_LIMIT_BAN_MS = 60_000;
const FAIL_FREQUNTLY_BAN_MS = 10_000;

export class ServerNetworkManager {
    private readonly server: NovaFlightServer;
    private readonly relayHandler: ServerRelayHandler;
    private readonly connections: Map<number, ServerConnection> = new Map();
    private readonly sidAddr: Map<number, string> = new Map();
    private readonly banned: Map<string, number> = new Map();

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.relayHandler = new ServerRelayHandler(this);

        server.networkChannel.setOnPayload(this.onReceive.bind(this));
        server.networkChannel.setOnFailDecode(this.onFailDecode.bind(this));
    }

    public tick(): void {
        for (const conn of this.connections.values()) {
            if (conn.shouldRemove()) {
                this.removeConnection(conn);
                conn.forceDisconnect();
                continue;
            }

            try {
                conn.tick();
            } catch (err) {
                if (conn.isHost()) throw err;
                // 目前只是限制数据包接收速率而非入口速率
                if (err instanceof RateLimitError) {
                    conn.disconnect(RATE_LIMIT);
                    this.tempBan(conn, RATE_LIMIT_BAN_MS);
                    Log.warn(`Connection "${conn.sid()}" at "${conn.getAddr()}" reach rate limit`);
                    continue;
                }

                Log.warn(`Failed to handle packet for ${conn.sid()}:\n  ${err}`);
                conn.disconnect(SERVER_ERROR);
            }
        }
    }

    public getConnection(sessionId: number): ServerConnection | undefined {
        return this.connections.get(sessionId);
    }

    // 销毁会话. 不会通知断线.
    public removeConnection(conn: ServerConnection): void {
        conn.handlerDisconnection();
        this.connections.delete(conn.sid());
    }

    public disconnectAllPlayer(): void {
        for (const player of this.server.playerManager.iterPlayers()) {
            player.networkHandler.disconnect(SERVER_CLOSE);
        }
    }

    private onReceive(sid: number, packet: Payload): void {
        if (sid === 0) {
            packet.accept(this.relayHandler);
            return;
        }

        const conn = this.connections.get(sid);
        if (conn) {
            conn.recv(packet);
            return;
        }

        // handshake
        if (packet instanceof ClientHandshakeC2SPacket) {
            const addr = this.getAddr(sid);
            if (!addr) {
                this.kick(sid);
                return;
            }

            const isHost = addr.host === '127.0.0.1' && this.server.isHostUUID(packet.clientId);

            const connection = new ServerConnection(this.server.networkChannel, sid, packet.clientId, addr, isHost);
            const handshake = new ServerHandshakeHandler(this.server, connection);
            connection.setPacketListener(ConnectionState.HANDSHAKING, handshake);
            handshake.onClientHandshake(packet);

            this.connections.set(sid, connection);
            return;
        }

        // 悬挂连接
        this.kick(sid);
    }

    private onFailDecode(sid: number) {
        const conn = this.connections.get(sid);
        if (!conn) {
            this.kick(sid);
            return;
        }

        if (conn.session.decodeErr()) {
            conn.disconnect(PROTOCOL_ERROR);
            this.tempBan(conn, FAIL_FREQUNTLY_BAN_MS);
            Log.warn(`Connection "${sid}" at "${conn.getAddr()}" decode fail too frequently`);
        }
    }

    private tempBan(conn: ServerConnection, duration: number) {
        const host = conn.getAddr().host;

        this.server.networkChannel.action(RelayActionBuilder.banIp(host));
        clearTimeout(this.banned.get(host));

        const timer = setTimeout(() => {
            this.banned.delete(host);
            this.server.networkChannel.action(RelayActionBuilder.unbanIp(host));
        }, duration);
        
        this.banned.set(host, timer);
        conn.forceDisconnect();
    }

    private getAddr(sid: number): SocketAddr | null {
        if (this.server.networkChannel instanceof ServerIntegratedChannel) {
            return SocketAddr.INTEGRATED;
        }

        const addr = this.sidAddr.get(sid);
        return addr != null ? SocketAddr.from(addr) : null;
    }

    private kick(sid: number) {
        // 立刻移除,依靠 Map.get 早退免去格式化地址.去掉不影响正确性
        this.sidAddr.delete(sid);
        this.server.networkChannel.action(RelayActionBuilder.forceDisconnect(sid));
    }

    public permit(sid: number, addr: string): void {
        this.sidAddr.set(sid, addr);
        this.server.networkChannel.action(RelayActionBuilder.allowTraffic(sid));
    }

    public detached(sid: number) {
        this.sidAddr.delete(sid);
    }

    public close(): void {
        this.disconnectAllPlayer();
    }
}