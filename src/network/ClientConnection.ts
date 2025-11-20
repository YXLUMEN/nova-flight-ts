import type {Channel} from "./Channel.ts";
import type {Payload} from "./Payload.ts";
import {BatchBufferPacket} from "./packet/BatchBufferPacket.ts";
import {PacketTooLargeError} from "../apis/errors.ts";
import type {Connection} from "./Connection.ts";

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

        try {
            const batch = new BatchBufferPacket(this.outboundBuffer);
            this.channel!.send(batch);
            this.outboundBuffer.length = 0;
        } catch (error) {
            if (error instanceof PacketTooLargeError) {
                console.warn('Batch too large, falling back to individual sends')
            } else {
                throw error;
            }
        }

        for (const packet of this.outboundBuffer) {
            this.channel!.send(packet);
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