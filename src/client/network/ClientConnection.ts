import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import type {Payload} from "../../network/Payload.ts";
import type {PacketListener} from "../../server/network/handler/PacketListener.ts";
import {ConnectionState, type ConnectionStateType} from "../../server/network/ConnectionState.ts";
import {IllegalStateException} from "../../type/errors.ts";
import type {Connection} from "../../network/Connection.ts";
import type {ClientChannel} from "./ClientChannel.ts";

export class ClientConnection implements Connection {
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(16);

    private channel: ClientChannel;
    private packetListener: PacketListener | null = null;

    private state: ConnectionStateType = ConnectionState.HANDSHAKING;

    public constructor(channel: ClientChannel) {
        this.channel = channel;
        this.recv = this.recv.bind(this);
        channel.setHandler(this.recv);
    }

    public tick(): void {
        if (!this.packetListener) return;
        while (!this.sendQueue.isEmpty()) {
            const packet = this.sendQueue.shift();
            if (!packet) break;
            this.sendImmediately(packet);
        }
        this.packetListener.tick?.();
    }

    public sendImmediately(packet: Payload): void {
        if (this.state === ConnectionState.CLOSED) return;
        this.channel.send(packet);
    }

    public send(packet: Payload): void {
        this.sendQueue.push(packet);
    }

    public recv(packet: Payload): void {
        this.packetListener?.accepts(packet);
    }

    public disconnect(): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;
        this.channel.disconnect();
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

    public changeChannel(channel: ClientChannel): void {
        this.channel.disconnect();
        this.channel = channel;
        channel.setHandler(this.recv);
    }

    public getChannel(): ClientChannel {
        return this.channel;
    }

    public clean(): void {
        this.disconnect();
        this.packetListener?.clear();
        this.packetListener = null;
        this.sendQueue.clear();
    }

    public getSessionId(): number {
        return this.channel.getSessionId();
    }
}