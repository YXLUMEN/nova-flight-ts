import type {Consumer, UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import {CodecRegistry} from "../../network/CodecRegistry.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import {empty} from "../../utils/uit.ts";

export class ClientIntegratedChannel implements ClientChannel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private readonly registry = CodecRegistry.PLAY_C2S;

    private ctrl: AbortController | null = null;
    private handler: Consumer<Payload> = empty;

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
        this.onMessage = this.onMessage.bind(this);
    }

    public getSessionId(): number {
        return 2;
    }

    public isConnected(): boolean {
        return this.ctrl !== null ? !this.ctrl.signal.aborted : false;
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

    public send(payload: Payload): void {
        const code = this.registry.get(payload.type());
        if (!code) throw new Error(`Unknown payload type: ${payload.type().id}`);

        const size = payload.estimateSize?.() ?? 6;
        const writer = new BinaryWriter(size + 2);
        writer.writeVarUint(code.index);
        code.codec.encode(writer, payload);

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
            const codec = CodecRegistry.getGlobalByIndex(index);
            if (!codec) return;

            this.handler(codec.codec.decode(reader));
            return;
        }

        if (event.data.type === 'disconnect') {
            this.disconnect();
        }
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public setHandler(handler: Consumer<Payload>): void {
        this.handler = handler;
    }

    public clearHandlers(): void {
        this.handler = empty;
    }

    public setRemote() {
    }
}
