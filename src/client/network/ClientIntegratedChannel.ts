import type {Consumer, UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import {CodecRegistry} from "../../network/CodecRegistry.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import {empty} from "../../utils/uit.ts";
import {IntegratedBatchBufferPacket} from "../../network/packet/common/IntegratedBatchBufferPacket.ts";

export class ClientIntegratedChannel implements ClientChannel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private readonly registry = CodecRegistry.C2S;

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
        const signal = ctrl.signal;

        const limiter = new AbortController();
        this.ctrl = limiter;

        const onConnect = (event: MessageEvent) => {
            if (event.data.type !== 'connect') return;
            resolve();
            ctrl.abort();
            this.worker.addEventListener('message', this.onMessage, {signal: limiter.signal});
        };

        signal.addEventListener('abort', () => {
            resolve();
        }, {once: true});

        limiter.signal.addEventListener('abort', () => {
            ctrl.abort();
        }, {once: true, signal});

        this.worker.addEventListener('message', onConnect, {signal});
        this.worker.postMessage({type: 'connect', clientId: this.clientId});

        return promise;
    }

    public disconnect(): void {
        this.ctrl?.abort();
        this.ctrl = null;
        this.worker.postMessage({type: 'disconnect'});
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
        switch (event.data.type) {
            case 'packet': {
                const reader = new BinaryReader(new Uint8Array(event.data.packet));

                const index = reader.readVarUint();
                const codec = CodecRegistry.byId(index);
                if (!codec) return;

                this.handler(codec.codec.decode(reader));
                return;
            }
            case 'batch' : {
                const {count, len, packet} = event.data;
                // console.assert(count > 0 && len > 0 && packet instanceof ArrayBuffer, 'Broken batched packet');

                const buffer = new Uint8Array(packet, 0, len);
                const batch = new IntegratedBatchBufferPacket(count, buffer);
                this.handler(batch);
                return;
            }
            case 'disconnect': {
                this.disconnect();
            }
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
