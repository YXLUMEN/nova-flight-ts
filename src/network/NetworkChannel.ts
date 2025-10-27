import type {Payload, PayloadId} from "./Payload.ts";
import {PayloadTypeRegistry} from "./PayloadTypeRegistry.ts";
import {BinaryWriter} from "../nbt/BinaryWriter.ts";
import {BinaryReader} from "../nbt/BinaryReader.ts";
import {Identifier} from "../registry/Identifier.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import type {Consumer, Supplier} from "../apis/types.ts";
import type {INetworkChannel} from "./INetworkChannel.ts";
import {RelayServerPacket} from "./packet/RelayServerPacket.ts";
import {sleep} from "../utils/uit.ts";

export abstract class NetworkChannel implements INetworkChannel {
    protected serverAddress: string;
    protected ws: WebSocket | null = null;

    private isConnected: boolean = false;
    private readyPromise: Promise<void> | null = null;
    private connectReady: Supplier<void> | null = null;
    private connectFail: Consumer<any> | null = null;

    protected readonly registry: PayloadTypeRegistry;
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    protected constructor(address: string, registry: PayloadTypeRegistry) {
        this.serverAddress = address;
        this.registry = registry;
    }

    public async connect() {
        if (this.readyPromise === null) {
            const {promise, resolve, reject} = Promise.withResolvers<void>();
            this.readyPromise = promise;
            this.connectReady = () => {
                this.isConnected = true;
                resolve();
            };
            this.connectFail = reject;
        }

        const ws = new WebSocket(`ws://${this.serverAddress}`);
        this.ws = ws;
        ws.binaryType = "arraybuffer";

        const ctrl = new AbortController();
        if (ws.readyState === WebSocket.OPEN) {
            this.connectReady?.();
            ctrl.abort();
        } else {
            ws.addEventListener("open", () => {
                this.connectReady?.();
                ctrl.abort();
            }, {once: true, signal: ctrl.signal});
            ws.addEventListener("error", (err) => {
                this.connectFail?.(err);
                ctrl.abort();
            }, {once: true, signal: ctrl.signal});
        }

        this.ws.onopen = () => this.register();

        this.ws.onmessage = (event) => {
            const binary = event.data as ArrayBuffer;
            const payload = this.decodePayload(new Uint8Array(binary));
            if (payload) {
                const handler = this.handlers.get(payload.getId().id);
                if (handler) handler(payload);
            }
        };

        this.ws.onerror = (event) => console.error(this.registry.getSide(), event);

        await this.readyPromise;
        this.readyPromise = null;
        this.connectReady = null;
        this.connectFail = null;
    }

    public disconnect(): void {
        this.isConnected = false;
        this.ws?.close();
    }

    public async sniff(url: string, retryDelay = 2000, maxRetries = 5): Promise<boolean> {
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
            if (attempts < maxRetries - 1) {
                await sleep(retryDelay);
            }
        }

        return false;
    }

    public receive<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.handlers.set(id.id, handler as Consumer<Payload>);
    }

    public send<T extends Payload>(payload: T): void {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();

        writer.writeByte(this.getHeader());
        writer.writeString(type.id.toString());

        type.codec.encode(writer, payload);

        this.ws!.send(writer.toUint8Array());
    }

    private decodePayload(buf: Uint8Array): Payload | null {
        const reader = new BinaryReader(buf);

        const header = reader.readByte();
        if (header === 0x00) {
            return RelayServerPacket.CODEC.decode(reader);
        }
        if (header !== 0x10 && header !== 0x11) {
            console.warn(`${this.getSide().toUpperCase()} -> Unknown header: ${header}`);
            return null;
        }

        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = PayloadTypeRegistry.getGlobal(id);
        if (!type) return null;

        return type.codec.decode(reader);
    }

    public setServerAddress(address: string): void {
        this.serverAddress = address;
    }

    public getServerAddress() {
        return this.serverAddress;
    }

    public clearHandlers(): void {
        this.handlers.clear();
    }

    public async waitConnect(): Promise<void> {
        if (this.isConnected) return;

        if (this.readyPromise === null) {
            throw new Error("Wait before connect");
        }

        await this.readyPromise;
    }

    protected abstract getSide(): string;

    protected abstract getHeader(): number;

    protected abstract register(): void;
}

