import {ConnectionState, type ConnectionStateType} from "./ConnectionState.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import type {Payload} from "../../network/Payload.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {UUID} from "../../apis/types.ts";
import type {PacketListener} from "./PacketListener.ts";
import {IllegalStateException} from "../../apis/errors.ts";

export class ServerConnection {
    public static readonly TIMEOUT = TranslatableText.of('network.disconnect.timeout');
    public static readonly AFK_TIMEOUT_MS = 60000; // 60s

    protected readonly channel: ServerChannel;
    private readonly sessionId: number;
    private readonly uuid: UUID;
    private readonly isLocal: boolean;

    private readonly receiveQueue: RingBuffer<Payload> = new RingBuffer(8);
    private packetListener: PacketListener | null = null;

    protected state: ConnectionStateType = ConnectionState.CONNECTING;
    private lastActivityTime: number;
    private disconnectStartTime: number = 0;

    public constructor(channel: ServerChannel, sessionId: number, uuid: UUID, isHost: boolean) {
        this.channel = channel;
        this.sessionId = sessionId;
        this.uuid = uuid;
        this.isLocal = isHost;
        this.lastActivityTime = performance.now();
    }

    public send(packet: Payload): void {
        if (this.state === ConnectionState.CLOSE) return;
        this.channel.sendToSessionId(packet, this.sessionId);
    }

    public broadcast(packet: Payload): void {
        if (this.state === ConnectionState.CLOSE) return;
        this.channel.send(packet);
    }

    public recv(packet: Payload): void {
        if (this.state !== ConnectionState.STABLE && !packet.canProcessInTransition?.()) return;

        this.lastActivityTime = performance.now();
        this.receiveQueue.push(packet);
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

    public changeState(state: ConnectionStateType): boolean {
        if (state < this.state) return false;
        this.state = state;
        return true;
    }

    public getState(): ConnectionStateType {
        return this.state;
    }

    public setPacketListener(state: ConnectionStateType, listener: PacketListener): void {
        if (state !== listener.getPhase()) {
            throw new IllegalStateException(`Listener protocol (${listener.getPhase()}) does not match requested one ${state}`);
        }
        this.packetListener = listener;
        this.changeState(state);
    }

    public disconnect(reason: TranslatableText): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;

        this.disconnectStartTime = performance.now();
        this.channel.sendToSessionId(new PlayerDisconnectS2CPacket(this.uuid, reason), this.sessionId);
    }

    public forceDisconnect(): void {
        if (!this.changeState(ConnectionState.CLOSE)) return;

        const writer = new BinaryWriter();
        writer.writeInt8(0xFF);
        writer.writeInt8(0x00);
        writer.writeInt8(this.sessionId);
        this.channel.action(writer.toUint8Array());
    }

    public checkActivate(timeout: number = 60000): void {
        if (performance.now() - this.lastActivityTime >= timeout) {
            this.disconnect(ServerConnection.TIMEOUT);
        }
    }

    public shouldRemove(): boolean {
        if (this.state === ConnectionState.CLOSE) return true;
        if (this.state === ConnectionState.DISCONNECTING) {
            return (performance.now() - this.disconnectStartTime) > 2000;
        }
        return false;
    }

    public isEmpty(): boolean {
        return this.receiveQueue.isEmpty();
    }

    public isHost() {
        return this.isLocal;
    }

    public cleanBuffer(): void {
        this.receiveQueue.clear();
    }
}