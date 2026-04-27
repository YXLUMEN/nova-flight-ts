import type {Consumer, UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import type {ClientChannel} from "./ClientChannel.ts";

export class ClientIntegratedChannel implements ClientChannel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private readonly registry = PayloadTypeRegistry.playC2S();

    private connected: boolean = false;
    private ctrl = new AbortController();
    private handler: Consumer<Payload> = () => {
    };

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
    }

    public async connect(): Promise<void> {
        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();

        const onConnect = (event: MessageEvent) => {
            if (event.data.type !== 'connect') return;
            this.connected = true;
            resolve();
            ctrl.abort();
        };

        this.worker.addEventListener('message', onConnect, {signal: ctrl.signal});
        this.worker.addEventListener('message', this.onMessage.bind(this), {signal: this.ctrl.signal});
        this.worker.postMessage({type: 'connect', clientId: this.clientId});

        return promise;
    }

    public disconnect(): void {
        if (!this.connected) return;
        this.connected = false;
        this.worker.postMessage({type: 'disconnect'});
        this.ctrl.abort();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public send<T extends Payload>(payload: T): void {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeVarUint(type.index);
        type.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        this.worker.postMessage({
            type: 'packet',
            packet: buffer
        }, {transfer: [buffer.buffer]});
    }

    private onMessage(event: MessageEvent): void {
        if (event.data.type === 'packet') {
            const binary = event.data.packet as ArrayBuffer;
            const reader = new BinaryReader(new Uint8Array(binary));

            const index = reader.readVarUint();
            const type = PayloadTypeRegistry.getGlobalByIndex(index);
            if (!type) return;

            const payload = type.codec.decode(reader);
            if (payload) this.handler(payload);
            return;
        }

        if (event.data.type === 'disconnect') {
            this.connected = false;
            this.ctrl.abort();
        }
    }

    public setHandler(handler: Consumer<Payload>): void {
        this.handler = handler;
    }

    public clearHandlers(): void {
        this.handler = () => {
        };
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
        return this.connected;
    }
}
