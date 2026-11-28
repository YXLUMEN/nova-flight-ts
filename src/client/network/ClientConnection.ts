import type {SocketAddr} from "../../network/SocketAddr.ts";
import type {Payload} from "../../network/Payload.ts";
import {Connection} from "../../network/Connection.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {ConnectionState} from "../../network/ConnectionState.ts";
import {Log} from "../../utils/Log.ts";
import {PacketIndexRange} from "../../type/errors.ts";

export class ClientConnection extends Connection {
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(16);

    public constructor(addr: SocketAddr) {
        super(NetworkSide.CLIENT, addr);
    }

    public override tick() {
        if (!this.packetListener) return;
        while (!this.sendQueue.isEmpty()) {
            const packet = this.sendQueue.shift();
            if (!packet) break;
            this.sendImmediately(packet);
        }
        this.packetListener.tick();
    }

    public override send(packet: Payload) {
        if (this.state < ConnectionState.PLAY) {
            this.sendImmediately(packet);
            return;
        }
        this.sendQueue.push(packet);
    }

    private sendImmediately(packet: Payload): void {
        if (this.isState(ConnectionState.CLOSED)) {
            console.warn('Sending packet when connection closed', packet);
            return;
        }
        this.channel.send(packet);
    }

    public override recv(payload: Payload) {
        this.packetListener?.accept(payload);
    }

    public override report(err: unknown) {
        if (err instanceof PacketIndexRange) {
            console.warn(err, this.state);
            return;
        }
        Log.error(err);
    }

    public getSessionId() {
        return this.channel.getSid();
    }

    public disconnect(): void {
        if (!this.changeState(ConnectionState.DISCONNECTING)) return;
        this.channel.close();
        this.changeState(ConnectionState.CLOSED);
    }

    public clean(): void {
        this.disconnect();
        this.packetListener?.clear();
        this.packetListener = null;
        this.state = ConnectionState.HANDSHAKING;
    }
}