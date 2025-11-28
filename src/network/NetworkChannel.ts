import type {Payload} from "./Payload.ts";
import {PayloadTypeRegistry} from "./PayloadTypeRegistry.ts";
import {BinaryWriter} from "../nbt/BinaryWriter.ts";
import {BinaryReader} from "../nbt/BinaryReader.ts";
import {Identifier} from "../registry/Identifier.ts";
import type {Consumer} from "../apis/types.ts";
import type {Channel} from "./Channel.ts";
import {RelayServerPacket} from "./packet/RelayServerPacket.ts";
import {sleep} from "../utils/uit.ts";
import {PacketTooLargeError} from "../apis/errors.ts";


export abstract class NetworkChannel implements Channel {
    public static readonly MAX_PACKET_SIZE = 4096;

    protected serverAddress: string;
    protected ws: WebSocket | null = null;

    private sessionId: number = 0;
    private isConnected: boolean = false;
    private readyPromise: Promise<void> | null = null;

    protected readonly registry: PayloadTypeRegistry;

    protected constructor(address: string, registry: PayloadTypeRegistry) {
        this.serverAddress = address;
        this.registry = registry;
    }

    public async connect() {
        if (this.isConnected) return;

        const {promise, resolve, reject} = Promise.withResolvers<void>();
        this.readyPromise = promise;

        let timeout: number;
        const connectReady = () => {
            clearTimeout(timeout);
            this.isConnected = true;
            resolve();
        };
        const connectFail = (reason: any) => {
            clearTimeout(timeout);
            reject(reason);
        };
        // @ts-ignore
        timeout = setTimeout(() => connectFail(`[${this.getSide()}] Connected timeout`), 6000);

        this.ws = new WebSocket(`ws://${this.serverAddress}`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onmessage = event => {
            const binary = event.data as ArrayBuffer;
            const payload = this.decodePayload(new Uint8Array(binary));

            if (!(payload instanceof RelayServerPacket)) return;

            const [type, msg] = payload.msg.split(':');
            if (type === 'ERR') {
                connectFail(msg);
                return;
            }

            if (!payload.msg.startsWith('INFO:REGISTERED')) return;

            const sessionIdStr = payload.msg.split(':').at(-1);
            if (!sessionIdStr) return;

            const sessionId = Number(sessionIdStr);
            if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 255) {
                connectFail(`[${this.getSide()}] Invalid session ID`);
                return;
            }
            this.sessionId = sessionId;
            connectReady();

            this.ws!.onmessage = this.handleMessage.bind(this);
            this.ws!.onerror = err => console.error(`[${this.getSide()}] Connection Error: ${err}`);
        };

        this.ws.onerror = error => {
            const msg = `[${this.getSide()}] Connection Error: ${error}`;
            console.error(msg);
            connectFail(msg);
        }

        this.ws.onopen = () => this.register();

        this.ws.onclose = event => {
            console.log(`[${this.getSide()}] Connection to ${this.serverAddress} closed because ${event.type}:${event.reason || 'unknown'}`);
        }

        await promise;
        this.readyPromise = null;
    }

    public disconnect(): void {
        this.isConnected = false;
        this.ws?.close(1000, 'Connection Closed');
        this.ws = null;
    }

    public async sniff(
        url: string,
        retryDelay = 2000,
        maxRetries = 5,
        tryCallback?: (attempts: number, max: number) => void,
        failCallback?: Consumer<void>
    ): Promise<boolean> {
        for (let attempts = 0; attempts < maxRetries; attempts++) {
            const {promise: ok, resolve} = Promise.withResolvers<boolean>();
            const test = new WebSocket(`ws://${url}`);

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

            if (tryCallback) tryCallback(attempts, maxRetries);
            if (attempts < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }

        if (failCallback) failCallback();
        return false;
    }

    public send<T extends Payload>(payload: T): void {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();

        writer.writeByte(this.getHeader());
        writer.writeByte(this.getSessionID());
        // noinspection DuplicatedCode
        writer.writeString(type.id.toString());

        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        if (buffer.length > NetworkChannel.MAX_PACKET_SIZE) {
            throw new PacketTooLargeError(`Packet ${payload.getId().id} exceeds 4096 bytes: ${buffer.length}`);
        }

        this.ws!.send(buffer);
    }

    protected decodePayload(buf: Uint8Array): Payload | null {
        const reader = new BinaryReader(buf);

        const header = reader.readByte();
        if (header === 0x00) {
            return RelayServerPacket.CODEC.decode(reader);
        }
        if (header !== 0x10 && header !== 0x11) {
            console.warn(`${this.getSide().toUpperCase()} -> Unknown header: ${header}`);
            return null;
        }

        reader.readUnsignByte();
        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = PayloadTypeRegistry.getGlobal(id);
        if (!type) return null;

        return type.codec.decode(reader);
    }

    protected abstract handleMessage(event: MessageEvent): void;

    public abstract clearHandlers(): void;

    public setServerAddress(address: string): void {
        this.serverAddress = address;
    }

    public getServerAddress() {
        return this.serverAddress;
    }

    public async waitConnect(): Promise<void> {
        if (this.isConnected) return;

        if (this.readyPromise === null) {
            throw new Error("Wait before connect");
        }

        await this.readyPromise;
    }

    public getSessionID() {
        return this.sessionId;
    }

    public isOpen(): boolean {
        return this.isConnected;
    }

    protected abstract getSide(): string;

    protected abstract getHeader(): number;

    protected abstract register(): void;
}

