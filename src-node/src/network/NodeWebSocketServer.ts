import {WebSocket, WebSocketServer} from 'ws';
import {SessionAllocator} from "./SessionAllocator.ts";
import {Session} from "./Session.ts";
import type {Consumer, UUID} from "../../../src/apis/types.ts";
import {UUIDUtil} from "../../../src/utils/UUIDUtil.ts";

export class NodeWebSocketServer {
    public static readonly MAX_PACKET_SIZE = 6144;

    private readonly wss: WebSocketServer;
    private readonly nextSessionId = new SessionAllocator();

    private readonly idToClient: Map<number, Session> = new Map();
    private readonly uuidToClient: Map<UUID, Session> = new Map();
    private readonly pending: Set<string> = new Set();

    private readonly onRegistry: Consumer<Session> | null = null;

    public constructor(port: number, onRegistry?: Consumer<Session>) {
        this.wss = new WebSocketServer({port});
        this.onRegistry = onRegistry ?? null;

        this.wss.on('connection', (ws, request) => {
            if (!request.socket.remoteAddress) {
                ws.close();
                return;
            }

            let registrationTimeout: NodeJS.Timeout;
            const register = async (payload: Buffer) => {
                const session = await this.registrySession(ws, request.socket.remoteAddress!, payload);

                clearTimeout(registrationTimeout);
                ws.off('message', register);
                if (session) {
                    this.onRegistry?.(session);
                    return;
                }
                ws.close();
            };

            registrationTimeout = setTimeout(() => {
                ws.close(4000, 'Registration Timeout');
                ws.off('message', register);
            }, 5000);

            ws.on('message', register);
        });
    }

    private async registrySession(ws: WebSocket, ip: string, payload: Buffer): Promise<Session | null> {
        if (payload.length < 17 || payload.length > NodeWebSocketServer.MAX_PACKET_SIZE) {
            this.sendAsRelay(ws, 'ERR:Invalid register packet');
            return null;
        }

        const rawUuid = payload.subarray(1, 17);
        const uuid: UUID = UUIDUtil.stringify(rawUuid);
        if (this.uuidToClient.has(uuid) || this.pending.has(uuid)) {
            this.sendAsRelay(ws, 'ERR:Duplicate Player');
            return null;
        }

        if (ws.readyState !== ws.OPEN) return null;
        this.pending.add(uuid);

        try {
            const sessionId = this.nextSessionId.allocate();
            if (!sessionId) {
                this.pending.delete(uuid);
                return null;
            }

            if (ws.readyState !== ws.OPEN) return null;
            const session = new Session(ws, ip, uuid, sessionId);

            ws.once('close', () => {
                this.uuidToClient.delete(uuid);
                this.idToClient.delete(sessionId);
            });

            this.sendAsRelay(ws, `INFO:REGISTERED:${sessionId}`);

            this.idToClient.set(sessionId, session);
            this.uuidToClient.set(uuid, session);
            return session;
        } catch (error) {
            console.error(error);
            return null;
        } finally {
            this.pending.delete(uuid);
        }
    }

    private sendAsRelay(ws: WebSocket, msg: string): void {
        if (ws.readyState !== WebSocket.OPEN) return;

        const buf = Buffer.alloc(3 + msg.length);
        buf[0] = 0x00;
        buf.writeUint16LE(msg.length);
        buf.write(msg, 3);
        ws.send(buf);
    }

    public broadcast(buffer: Uint8Array): void {
        for (const client of this.uuidToClient.values()) {
            client.send(buffer);
        }
    }

    public sendTo(buffer: Uint8Array, uuid: UUID): void {
        const client = this.uuidToClient.get(uuid);
        if (client) client.send(buffer);
    }

    public clients() {
        return this.uuidToClient.values();
    }

    public clientCount(): number {
        return this.uuidToClient.size;
    }

    public closeConnection(uuid: UUID): void {
        const session = this.uuidToClient.get(uuid);
        if (!session) return;

        session.ws.close();
        this.uuidToClient.delete(session.uuid);
        this.idToClient.delete(session.sessionId);
        this.nextSessionId.deallocate(session.sessionId);
    }

    public shutdown(): void {
        this.wss.close();
        this.uuidToClient.clear();
        this.idToClient.clear();
        this.pending.clear();
    }
}