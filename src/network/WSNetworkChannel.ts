import type {Payload} from "./Payload.ts";
import {type CodecEntry, CodecRegistry} from "./CodecRegistry.ts";
import {BinaryWriter} from "../serialization/BinaryWriter.ts";
import type {BiConsumer} from "../type/types.ts";
import type {Channel} from "./Channel.ts";
import {sleep} from "../utils/uit.ts";
import {PacketTooLargeError} from "../type/errors.ts";
import type {NetworkSide} from "./NetworkSide.ts";
import {RelayHandshake} from "./RelayHandshake.ts";


export abstract class WSNetworkChannel implements Channel {
    public static readonly MAX_PACKET_SIZE = 6144;

    public readonly side: NetworkSide;
    protected readonly registry: CodecRegistry;

    private address: string;
    private ws: WebSocket | null = null;

    private sessionId: number = 0;

    protected constructor(side: NetworkSide, address: string, registry: CodecRegistry) {
        this.side = side;
        this.address = address;
        this.registry = registry;
    }

    public getSessionId(): number {
        return this.sessionId;
    }

    public isConnected(): boolean {
        return this.ws ? this.ws.readyState === WebSocket.OPEN : false;
    }

    public sendRaw(buf: Uint8Array<ArrayBuffer>): void {
        if (buf.length > WSNetworkChannel.MAX_PACKET_SIZE) {
            throw new PacketTooLargeError(`Packet exceeds ${WSNetworkChannel.MAX_PACKET_SIZE} bytes: ${buf.length}`);
        }

        this.ws!.send(buf);
    }

    public abstract send(payload: Payload): void;

    protected checkAndSend<T extends Payload>(writer: BinaryWriter, codec: CodecEntry<T>, payload: T): void {
        writer.writeVarUint(codec.index);
        codec.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        if (buffer.length > WSNetworkChannel.MAX_PACKET_SIZE) {
            const max = WSNetworkChannel.MAX_PACKET_SIZE;
            throw new PacketTooLargeError(`Packet ${payload.type().id} exceeds ${max} bytes: ${buffer.length}`);
        }

        this.ws!.send(buffer);
    }

    public async connect(): Promise<void> {
        if (this.isConnected()) return;

        this.ws = new WebSocket(`ws://${this.address}`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => this.register();
        this.ws.onclose = event => {
            console.log(`[${this.side}] Connection to ${this.address} closed because ${event.type}:${event.reason || 'unknown'}`);
        }

        const handShake = new RelayHandshake(this.ws, this.side);
        this.sessionId = await handShake.alloc();

        this.ws!.onmessage = this.handleMessage.bind(this);
        this.ws!.onerror = event =>
            console.error(`[${this.side}] Connection Error: ${event.type}:${event.target}`);
    }

    public disconnect(): void {
        this.ws?.close(1000, 'Connection Closed');
        this.ws = null;
        this.clearHandlers();
    }

    public async sniff(retryDelay = 2000, maxRetries = 5, onTry?: BiConsumer<number, number>): Promise<boolean> {
        const addr = `ws://${this.address}`;

        for (let attempts = 0; attempts < maxRetries; attempts++) {
            const {promise: ok, resolve} = Promise.withResolvers<boolean>();
            const test = new WebSocket(addr);

            test.onopen = () => {
                console.log("Server reachable");
                test.close();
                resolve(true);
            };

            test.onerror = () => {
                console.warn(`Server not reachable (attempt ${attempts + 1}/${maxRetries})`);
                test.close();
                resolve(false);
            };

            if (await ok) return true;

            onTry?.(attempts, maxRetries);
            if (attempts < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }

        return false;
    }

    protected abstract handleMessage(event: MessageEvent): void;

    public abstract clearHandlers(): void;

    public setRemote(addr: string) {
        this.address = addr;
    }

    protected abstract register(): void;
}

