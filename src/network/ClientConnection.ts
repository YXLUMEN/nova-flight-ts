import type {Channel} from "./Channel.ts";
import type {Payload} from "./Payload.ts";
import type {Connection} from "./Connection.ts";
import {NetworkChannel} from "./NetworkChannel.ts";
import {BatchBufferPacket} from "./packet/BatchBufferPacket.ts";

export class ClientConnection implements Connection {
    private channel: Channel | null = null;
    private outboundBuffer: Payload[] = [];

    public channelActive(channel: Channel): void {
        this.channel = channel;
    }

    public send(packet: Payload, flush: boolean): void {
        this.outboundBuffer.push(packet);

        if (this.isOpen() && flush) {
            this.flush();
        }
    }

    public sendImmediate(packet: Payload): void {
        this.channel!.send(packet);
    }

    public flush(): void {
        if (!this.isOpen() || this.outboundBuffer.length === 0) return;

        let size = 0;
        const buffer: Payload[] = [];
        for (const payload of this.outboundBuffer) {
            if (!payload.estimateSize) {
                this.channel!.send(payload);
                continue;
            }

            const est = payload.estimateSize();
            if (size + est > NetworkChannel.MAX_PACKET_SIZE) {
                this.channel!.send(new BatchBufferPacket(buffer));
                buffer.length = 0;
                size = 0;
            }

            buffer.push(payload);
            size += est;
        }

        if (buffer.length > 0) {
            this.channel!.send(new BatchBufferPacket(buffer));
        }

        this.outboundBuffer.length = 0;
    }

    public disconnect(): void {
        if (!this.isOpen()) return;
        this.channel!.disconnect();
        this.channel = null;
    }

    public isOpen() {
        return this.channel !== null && this.channel.isOpen();
    }

    public tick(): void {
        this.flush();
    }
}