import type {Consumer, UUID} from "../../apis/types.ts";
import type {Channel} from "../../network/Channel.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {HashMap} from "../../utils/collection/HashMap.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";

export class ClientIntegratedNetWorkChannel implements Channel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private readonly registry = PayloadTypeRegistry.playC2S();
    private readonly handlers = new HashMap<Identifier, Consumer<Payload>>();

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
    }

    public async connect(): Promise<void> {
        this.worker.postMessage({type: "connect", clientId: this.clientId});

        this.worker.onmessage = this.onMessage.bind(this);
    }

    public disconnect(): void {
        this.worker.postMessage({type: "disconnect"});
    }

    public sniff(_url: string, retryDelay: number, maxRetries: number): Promise<boolean> {
        const {promise, resolve} = Promise.withResolvers<boolean>();

        let timer: NodeJS.Timeout;
        let retries = 1;
        const ctrl = new AbortController();

        const done = (result: boolean) => {
            clearInterval(timer);
            ctrl.abort();
            resolve(result);
        };

        this.worker.addEventListener("message", event => {
            if (event.type !== "sniff") return;
            done(true);
        }, {signal: ctrl.signal});

        this.worker.postMessage({type: "sniff"});
        timer = setInterval(() => {
            retries++;
            this.worker.postMessage({type: "sniff"});

            if (retries > maxRetries) done(false);
        }, retryDelay);

        return promise;
    }

    public receive<T extends Payload>(id: PayloadId<T>, handler: Consumer<T>): void {
        this.handlers.set(id.id, handler as Consumer<Payload>);
    }

    public send<T extends Payload>(payload: T): void {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeString(type.id.toString());

        type.codec.encode(writer, payload);

        this.worker.postMessage({type: "packet", packet: writer.toUint8Array()});
    }

    private decodePayload(buf: Uint8Array): Payload | null {
        const reader = new BinaryReader(buf);

        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = PayloadTypeRegistry.getGlobal(id);
        if (!type) return null;

        return type.codec.decode(reader);
    }

    private onMessage(event: MessageEvent): void {
        if (event.type === "PACKET") {
            const binary = event.data as ArrayBuffer;
            const payload = this.decodePayload(new Uint8Array(binary));
            if (payload) {
                const handler = this.handlers.get(payload.getId().id);
                if (handler) handler(payload);
            }
        } else if (event.type === "DISCONNECT") {
            this.worker.terminate();
        }
    }

    public isOpen(): boolean {
        return true;
    }
}