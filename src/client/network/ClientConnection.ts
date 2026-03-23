import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import type {Payload} from "../../network/Payload.ts";
import type {PacketListener} from "../../server/network/handler/PacketListener.ts";
import {ConnectionState, type ConnectionStateType} from "../../server/network/ConnectionState.ts";
import type {ClientNetworkChannel} from "./ClientNetworkChannel.ts";
import {IllegalStateException} from "../../apis/errors.ts";

export class ClientConnection {
    private readonly channel: ClientNetworkChannel;
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(8);

    private packetListener: PacketListener | null = null;

    private state: ConnectionStateType = ConnectionState.HANDSHAKING;

    public constructor(channel: ClientNetworkChannel) {
        this.channel = channel;
        channel.setHandler(this.recv.bind(this));
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

    public clean(): void {
        this.disconnect();
        this.packetListener?.clear();
        this.packetListener = null;
        this.sendQueue.clear();
    }
}