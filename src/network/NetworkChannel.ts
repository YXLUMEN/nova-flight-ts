import type {Payload} from "./Payload.ts";
import {type PayloadType, PayloadTypeRegistry} from "./PayloadTypeRegistry.ts";
import {BinaryWriter} from "../serialization/BinaryWriter.ts";
import {BinaryReader} from "../serialization/BinaryReader.ts";
import type {Consumer} from "../type/types.ts";
import type {Channel} from "./Channel.ts";
import {sleep} from "../utils/uit.ts";
import {PacketTooLargeError} from "../type/errors.ts";
import {RelayPackets} from "./RelayPackets.ts";
import {Attached} from "./packet/relay/Attached.ts";
import {RelayMessage} from "./packet/relay/RelayMessage.ts";


export abstract class NetworkChannel implements Channel {
    // 单个数据包最大长度
    public static readonly MAX_PACKET_SIZE = 6144;

    protected serverAddress: string;
    protected ws: WebSocket | null = null;

    private sessionId: number = 0;
    private isConnected: boolean = false;
    private ready: Promise<void> | null = null;

    protected readonly registry: PayloadTypeRegistry;

    protected constructor(address: string, registry: PayloadTypeRegistry) {
        this.serverAddress = address;
        this.registry = registry;
    }

    public async connect(): Promise<void> {
        if (this.isConnected) return;

        const {promise, resolve, reject} = Promise.withResolvers<void>();
        this.ready = promise;

        let timeout: number;
        const connectReady = () => {
            clearTimeout(timeout);
            this.isConnected = true;
            resolve();
            console.log(`[${this.getSide()}] Successfully connected to ${this.serverAddress} at ${new Date().toISOString()}`);
        };
        const connectFail = (reason: any) => {
            clearTimeout(timeout);
            reject(reason);
        };
        timeout = setTimeout(() => connectFail(`[${this.getSide()}] Connected timeout`), 6000);

        console.log(`A ${this.getSide()} side connecting start at ${new Date().toISOString()}`);
        this.ws = new WebSocket(`ws://${this.serverAddress}`);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onmessage = event => {
            const binary = event.data as ArrayBuffer;
            const buffer = new Uint8Array(binary);
            if (buffer[0] !== 0x00) return;

            const packet = this.decodePayload(buffer);

            if (packet instanceof RelayMessage) {
                const parts = packet.msg.split(':');
                const type = parts[0];
                const msg = parts.slice(1).join(':');

                if (type === 'ERR') connectFail(msg);
                console.log(msg);
                return;
            }

            if (!(packet instanceof Attached)) return;

            const sessionId = packet.sessionId;
            if (!Number.isSafeInteger(sessionId) || sessionId <= 0 || sessionId > 64) {
                connectFail(`[${this.getSide()}] Invalid session ID`);
                return;
            }
            this.sessionId = sessionId;
            connectReady();

            this.ws!.onmessage = this.handleMessage.bind(this);
            this.ws!.onerror = event =>
                console.error(`[${this.getSide()}] Connection Error: ${event.type}${event.target}`);
        };

        this.ws.onerror = event => {
            const msg = `[${this.getSide()}] Connection Error: ${event.type}:${event.target}`;
            console.error(msg);
            connectFail(msg);
        }

        this.ws.onopen = () => this.register();

        this.ws.onclose = event => {
            console.log(`[${this.getSide()}] Connection to ${this.serverAddress} closed because ${event.type}:${event.reason || 'unknown'}`);
        }

        await promise;
        this.ready = null;
    }

    public disconnect(): void {
        this.isConnected = false;
        this.ws?.close(1000, 'Connection Closed');
        this.ws = null;
        this.clearHandlers();
    }

    public async sniff(
        url: string,
        retryDelay = 2000,
        maxRetries = 5,
        tryCallback?: (attempts: number, max: number) => void,
        failCallback?: Consumer<void>
    ): Promise<boolean> {
        const addr = `ws://${url}`;
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

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(this.getHeader());
        writer.writeInt8(this.getSessionId());

        this.checkAndSend(writer, type, payload);
    }

    protected checkAndSend<T extends Payload>(writer: BinaryWriter, type: PayloadType<T>, payload: T): void {
        if (!this.isOpen()) return;

        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        if (buffer.length > NetworkChannel.MAX_PACKET_SIZE) {
            throw new PacketTooLargeError(`Packet ${payload.getId().id} exceeds 6144 bytes: ${buffer.length}`);
        }

        this.ws!.send(buffer);
    }

    protected decodePayload(buf: Uint8Array<ArrayBuffer>): Payload | null {
        const reader = new BinaryReader(buf);

        const header = reader.readUint8();
        if (header === 0x00) {
            const index = reader.readUint8();
            const type = RelayPackets.getType(index);
            if (!type) return null;
            return type.codec.decode(reader);
        }

        if (header < 0x10 || header > 0x12) {
            console.warn(`[${this.getSide()}] Unknown header: ${header}`);
            return null;
        }

        // pass sessionId
        reader.readUint8();
        const index = reader.readVarUint();
        const type = PayloadTypeRegistry.getGlobalByIndex(index);
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

        if (this.ready === null) {
            throw new Error("Wait before connect");
        }

        await this.ready;
    }

    public getSessionId() {
        return this.sessionId;
    }

    public isOpen(): boolean {
        return this.isConnected && !!this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    protected abstract getSide(): string;

    protected abstract getHeader(): number;

    protected abstract register(): void;
}

