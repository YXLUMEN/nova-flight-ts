import {ConnectionState} from "./ConnectionState.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import type {Payload} from "../../network/Payload.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {UUID} from "../../type/types.ts";
import type {PacketListener} from "../../network/handler/PacketListener.ts";
import {IllegalStateException} from "../../type/errors.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";
import type {Connection} from "../../network/Connection.ts";

export class ServerConnection implements Connection {
    public static readonly TIMEOUT = TranslatableText.of('network.disconnect.timeout');
    public static readonly AFK_TIMEOUT_MS = 60000; // 60s

    private readonly channel: ServerChannel;
    private readonly sessionId: number;
    private readonly uuid: UUID;
    private readonly isLocal: boolean;

    private readonly receiveQueue: RingBuffer<Payload> = new RingBuffer(32);
    private packetListener: PacketListener | null = null;

    private state: ConnectionState = ConnectionState.HANDSHAKING;
    private lastActivityTime: number;
    private disconnectStartTime: number = 0;

    public constructor(channel: ServerChannel, sessionId: number, uuid: UUID, isHost: boolean) {
        this.channel = channel;
        this.sessionId = sessionId;
        this.uuid = uuid;
        this.isLocal = isHost;
        this.lastActivityTime = performance.now();
    }

    public tick(): void {
        if (!this.packetListener) return;
        while (!this.receiveQueue.isEmpty()) {
            const payload = this.receiveQueue.shift();
            if (!payload) break;
            this.packetListener.accept(payload);
        }
        this.packetListener.tick?.();
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

        this.lastActivityTime = performance.now();
        this.receiveQueue.push(payload);
    }

    public disconnect(reason: TranslatableText): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;

        this.disconnectStartTime = performance.now();
        this.send(new PlayerDisconnectS2CPacket(this.uuid, reason));
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
        if (this.state === ConnectionState.CLOSED) {
            console.warn('ServerConnection disconnect call twice');
            return;
        }
        this.packetListener?.onDisconnected();
        this.forceDisconnect();
    }

    public setPacketListener(state: ConnectionState, listener: PacketListener): void {
        if (state !== listener.getPhase()) {
            throw new IllegalStateException(`Listener protocol (${listener.getPhase()}) does not match requested one ${state}`);
        }
        this.packetListener = listener;
        this.changeState(state);
    }

    public checkActivate(timeout: number = ServerConnection.AFK_TIMEOUT_MS): void {
        if (performance.now() - this.lastActivityTime >= timeout) {
            this.disconnect(ServerConnection.TIMEOUT);
        }
    }

    public shouldRemove(): boolean {
        if (this.state === ConnectionState.CLOSED) return true;
        if (this.state === ConnectionState.DISCONNECTING) {
            return (performance.now() - this.disconnectStartTime) > 2000;
        }
        return false;
    }

    public getId(): number {
        return this.sessionId;
    }

    public getUUID(): UUID {
        return this.uuid;
    }

    public isHost(): boolean {
        return this.isLocal;
    }

    public cleanBuffer(): void {
        this.receiveQueue.clear();
    }
}