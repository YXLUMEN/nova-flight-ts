import type {Payload, PayloadId} from "./Payload.ts";
import {PayloadTypeRegistry} from "./PayloadTypeRegistry.ts";
import {BinaryWriter} from "../nbt/BinaryWriter.ts";
import {BinaryReader} from "../nbt/BinaryReader.ts";
import {Identifier} from "../registry/Identifier.ts";
import {HashMap} from "../utils/collection/HashMap.ts";
import type {Consumer, Supplier} from "../apis/types.ts";
import type {INetworkChannel} from "./INetworkChannel.ts";
import {RelayServerPacket} from "./packet/RelayServerPacket.ts";

export abstract class NetworkChannel implements INetworkChannel {
    protected serverAddress: string;
    protected ws: WebSocket | null = null;

    private ready: Promise<void> | null = null;
    private resolve: Supplier<void> | null = null;
    private reject: Consumer<any> | null = null;

    protected readonly registry: PayloadTypeRegistry;
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    protected constructor(address: string, registry: PayloadTypeRegistry) {
        this.serverAddress = address;
        this.registry = registry;
    }

    public async connect() {
        if (this.ready === null) {
            const {promise, resolve, reject} = Promise.withResolvers<void>();
            this.ready = promise;
            this.resolve = resolve;
            this.reject = reject;
        }

        const ws = new WebSocket(`ws://${this.serverAddress}`);
        this.ws = ws;

        ws.binaryType = "arraybuffer";

        const ctrl = new AbortController();
        if (ws.readyState === WebSocket.OPEN) {
            this.resolve?.();
            ctrl.abort();
        } else {
            ws.addEventListener("open", () => {
                this.resolve?.();
                ctrl.abort();
            }, {once: true, signal: ctrl.signal});
            ws.addEventListener("error", (err) => {
                this.reject?.(err);
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

        this.ws.onerror = (event) => {
            console.error(this.registry.getSide(), event);
        }

        await this.ready;
        this.ready = null;
        this.resolve = null;
        this.reject = null;
    }

    public async sniff(url: string, retryDelay = 2000, maxRetries = 5): Promise<boolean> {
        let attempts = 0;

        const conn = () => {
            const {promise, resolve} = Promise.withResolvers<boolean>();
            attempts++;

            const test = new WebSocket(`ws://${url}`);
            test.onopen = () => {
                console.log("Server reachable");
                test.close();
                resolve(true);
            };

            test.onerror = () => {
                console.warn("Server not reachable");
                test.close();
                if (attempts < maxRetries) {
                    setTimeout(() => conn()
                            .then(resolve)
                            .catch(() => resolve(false)),
                        retryDelay);
                } else {
                    resolve(false);
                }
            };

            return promise;
        }

        return conn();
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
        await this.ready;
    }

    public disconnect(): void {
        this.ws?.close();
    }

    protected abstract getSide(): string;

    protected abstract getHeader(): number;

    protected abstract register(): void;
}

