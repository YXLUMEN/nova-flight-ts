import type {Payload} from "./Payload.ts";
import type {PayloadTypeRegistry} from "./PayloadTypeRegistry.ts";
import {NbtBinaryWriter} from "../nbt/NbtBinaryWriter.ts";
import {NbtBinaryReader} from "../nbt/NbtBinaryReader.ts";
import {Identifier} from "../registry/Identifier.ts";
import {HashMap} from "../utils/collection/HashMap.ts";

export abstract class NetworkChannel {
    private readonly ready: Promise<void>;
    private readonly handlers = new HashMap<Identifier, (payload: Payload) => void>();

    protected readonly ws: WebSocket;
    protected readonly registry: PayloadTypeRegistry;

    protected constructor(ws: WebSocket, registry: PayloadTypeRegistry) {
        ws.binaryType = "arraybuffer";

        this.ws = ws;
        this.registry = registry;

        const ctrl = new AbortController();
        this.ready = new Promise<void>((resolve, reject) => {
            if (this.ws.readyState === WebSocket.OPEN) {
                resolve();
                ctrl.abort();
            } else {
                this.ws.addEventListener("open", () => {
                    resolve();
                    ctrl.abort();
                }, {once: true, signal: ctrl.signal});
                this.ws.addEventListener("error", (err) => {
                    reject(err);
                    ctrl.abort();
                }, {once: true, signal: ctrl.signal});
            }
        });

        this.ws.onmessage = (event) => {
            const binary = event.data as ArrayBuffer;
            const payload = this.decodePayload(new Uint8Array(binary));
            if (payload) {
                const handler = this.handlers.get(payload.getId());
                if (handler) handler(payload);
            }
        };
    }

    protected abstract getSide(): string;

    protected abstract getHeader(): number;

    protected abstract register(): void;

    public init() {
        this.ws.onopen = () => {
            this.register();
        };
    }

    public async waitConnect(): Promise<void> {
        return this.ready;
    }

    public receive<T extends Payload>(id: Identifier, handler: (payload: T) => void) {
        this.handlers.set(id, handler as (p: Payload) => void);
    }

    public send<T extends Payload>(payload: T) {
        const type = this.registry.get(payload.getId());
        if (!type) throw new Error("Unknown payload type");

        const writer = new NbtBinaryWriter();

        writer.writeInt8(this.getHeader());
        writer.writeString(type.id.toString());

        type.codec.encode(payload, writer);

        this.ws.send(writer.toUint8Array());
    }

    private decodePayload(buf: Uint8Array): Payload | null {
        const reader = new NbtBinaryReader(buf);

        const header = reader.readInt8();
        if (header !== 0x10 && header !== 0x11) {
            console.warn("Unknown header:", header);
            return null;
        }

        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = this.registry.get(id);
        if (!type) return null;

        return type.codec.decode(reader);
    }
}

