import type {Connection} from "../../network/Connection.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import type {UUID} from "../../type/types.ts";
import type {PacketListener} from "../../network/handler/PacketListener.ts";
import type {Payload} from "../../network/Payload.ts";
import type {SocketAddr} from "../../network/SocketAddr.ts";
import {ConnectionState} from "./ConnectionState.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {IllegalStateError} from "../../type/errors.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import {Session} from "./Session.ts";

export class ServerConnection implements Connection {
    private static readonly TIMEOUT = 'network.disconnect.timeout';

    public readonly session: Session;

    private readonly channel: ServerChannel;
    private readonly sessionId: number;
    private readonly uuid: UUID;
    private readonly addr: SocketAddr;
    private readonly isLocal: boolean;

    private readonly receiveQueue: RingBuffer<Payload> = new RingBuffer(32);
    private packetListener: PacketListener | null = null;

    private state: ConnectionState = ConnectionState.HANDSHAKING;
    private handlerDisconnected = false;

    public constructor(
        channel: ServerChannel,
        sessionId: number,
        uuid: UUID,
        addr: SocketAddr,
        isHost: boolean
    ) {
        this.channel = channel;
        this.sessionId = sessionId;
        this.uuid = uuid;
        this.addr = addr;
        this.isLocal = isHost;
        this.session = new Session();
    }

    public tick(): void {
        this.session.tick();

        if (!this.packetListener) return;
        while (!this.receiveQueue.isEmpty()) {
            const payload = this.receiveQueue.shift();
            if (!payload) break;
            this.packetListener.accept(payload);
        }
        this.packetListener.tick();
    }

    public send(payload: Payload): void {
        if (this.state === ConnectionState.CLOSED) return;
        this.channel.sendToId(payload, this.sessionId);
    }

    public broadcast(payload: Payload, flush = false): void {
        if (this.state === ConnectionState.CLOSED) return;
        flush ? this.channel.send(payload) : this.channel.enqueue(payload);
    }

    public recv(payload: Payload): void {
        if (this.state !== ConnectionState.PLAY && !payload.canProcessInTransition?.()) return;

        this.session.active();
        this.receiveQueue.push(payload);
    }

    public disconnect(reason: string, args?: string[]): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;

        this.session.startDisconnect();
        this.send(new PlayerDisconnectS2CPacket(this.uuid, reason, args));
    }

    public forceDisconnect(): void {
        if (!this.changeState(ConnectionState.CLOSED)) return;
        this.channel.action(RelayActionBuilder.forceDisconnect(this.sessionId));
    }

    public changeState(state: ConnectionState): boolean {
        if (state < this.state) return false;
        this.state = state;
        return true;
    }

    public getState(): ConnectionState {
        return this.state;
    }

    public handlerDisconnection(): void {
        if (this.handlerDisconnected) {
            console.warn('[Server] Connection disconnect call twice');
            return;
        }

        this.handlerDisconnected = true;
        this.packetListener?.onDisconnected();
    }

    public setPacketListener(state: ConnectionState, listener: PacketListener): void {
        if (state !== listener.getPhase()) {
            throw new IllegalStateError(`Listener protocol (${listener.getPhase()}) does not match requested one ${state}`);
        }
        this.packetListener = listener;
        this.changeState(state);
    }

    public checkActivate(timeout: number): void {
        if (this.session.announceDead(timeout)) {
            this.disconnect(ServerConnection.TIMEOUT);
        }
    }

    public shouldRemove(): boolean {
        if (this.state === ConnectionState.CLOSED) return true;
        if (this.state === ConnectionState.DISCONNECTING) {
            return this.session.isDead();
        }
        return false;
    }

    public sid(): number {
        return this.sessionId;
    }

    public isHost(): boolean {
        return this.isLocal;
    }

    public getAddr() {
        return this.addr;
    }

    public cleanBuffer(): void {
        this.receiveQueue.clear();
    }

    public toString(): string {
        return `[ServerConnection] SID(${this.sessionId}), UUID(${this.uuid}), IsLocal(${this.isLocal}), State(${this.state})`;
    }
}