import type {Consumer, UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import {empty} from "../../utils/uit.ts";

export class ClientIntegratedChannel implements ClientChannel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private readonly registry = PayloadTypeRegistry.playC2S();

    private ctrl: AbortController | null = null;
    private handler: Consumer<Payload> = empty;

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
        this.onMessage = this.onMessage.bind(this);
    }

    public async connect(): Promise<void> {
        if (this.ctrl) return;

        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();
        this.ctrl = new AbortController();

        const onConnect = (event: MessageEvent) => {
            if (event.data.type !== 'connect') return;
            resolve();
            ctrl.abort();
            this.worker.addEventListener('message', this.onMessage, {signal: this.ctrl!.signal});
        };

        this.worker.addEventListener('message', onConnect, {signal: ctrl.signal});
        this.worker.postMessage({type: 'connect', clientId: this.clientId});

        return promise;
    }

    public disconnect(): void {
        if (!this.ctrl || !this.ctrl.signal.aborted) return;
        this.ctrl.abort();

        this.worker.postMessage({type: 'disconnect'});
        this.ctrl = null;
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public send<T extends Payload>(payload: T): void {
        // noinspection DuplicatedCode
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const size = payload.estimateSize?.() ?? 6;
        const writer = new BinaryWriter(size + 2);
        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        this.worker.postMessage({
            type: 'packet',
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    private onMessage(event: MessageEvent): void {
        if (event.data.type === 'packet') {
            const reader = new BinaryReader(new Uint8Array(event.data.packet));

            const index = reader.readVarUint();
            const type = PayloadTypeRegistry.getGlobalByIndex(index);
            if (!type) return;

            const payload = type.codec.decode(reader);
            if (payload) this.handler(payload);
            return;
        }

        if (event.data.type === 'disconnect') {
            this.disconnect();
        }
    }

    public setHandler(handler: Consumer<Payload>): void {
        this.handler = handler;
    }

    public clearHandlers(): void {
        this.handler = empty;
    }

    public getSessionId(): number {
        return 2;
    }

    public setServerAddress(): void {
    }

    public getServerAddress(): string {
        return '127.0.0.1';
    }

    public isOpen(): boolean {
        return !!this.ctrl && !this.ctrl.signal.aborted;
    }
}
