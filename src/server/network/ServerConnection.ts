import {ConnectionState, type ConnectionStateType} from "./ConnectionState.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import type {Payload} from "../../network/Payload.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import type {UUID} from "../../type/types.ts";
import type {PacketListener} from "./handler/PacketListener.ts";
import {IllegalStateException} from "../../type/errors.ts";
import {RelayActionBuilder} from "./RelayActionBuilder.ts";

export class ServerConnection {
    public static readonly TIMEOUT = TranslatableText.of('network.disconnect.timeout');
    public static readonly AFK_TIMEOUT_MS = 60000; // 60s

    private readonly channel: ServerChannel;
    private readonly sessionId: number;
    private readonly uuid: UUID;
    private readonly isLocal: boolean;

    private readonly receiveQueue: RingBuffer<Payload> = new RingBuffer(64);
    private packetListener: PacketListener | null = null;

    private state: ConnectionStateType = ConnectionState.HANDSHAKING;
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
            const packet = this.receiveQueue.shift();
            if (!packet) break;
            this.packetListener.accepts(packet);
        }
        this.packetListener.tick?.();
    }

    public send(packet: Payload): void {
        if (this.state === ConnectionState.CLOSED) return;
        this.channel.sendToSessionId(packet, this.sessionId);
    }

    public broadcast(packet: Payload): void {
        if (this.state === ConnectionState.CLOSED) return;
        this.channel.send(packet);
    }

    public recv(packet: Payload): void {
        if (this.state !== ConnectionState.PLAY && !packet.canProcessInTransition?.()) return;

        this.lastActivityTime = performance.now();
        this.receiveQueue.push(packet);
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

    public changeState(state: ConnectionStateType): boolean {
        if (state < this.state) return false;
        this.state = state;
        return true;
    }

    public getState(): ConnectionStateType {
        return this.state;
    }

    public handlerDisconnection(): void {
        if (this.state === ConnectionState.CLOSED) {
            console.warn('handlerDisconnect call twice');
            return;
        }
        this.packetListener?.onDisconnected();
        this.forceDisconnect();
    }

    public setPacketListener(state: ConnectionStateType, listener: PacketListener): void {
        if (state !== listener.getPhase()) {
            throw new IllegalStateException(`Listener protocol (${listener.getPhase()}) does not match requested one ${state}`);
        }
        this.packetListener = listener;
        this.changeState(state);
    }

    public checkActivate(timeout: number = 60000): void {
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

    public isEmpty(): boolean {
        return this.receiveQueue.isEmpty();
    }

    public isHost(): boolean {
        return this.isLocal;
    }

    public cleanBuffer(): void {
        this.receiveQueue.clear();
    }
}