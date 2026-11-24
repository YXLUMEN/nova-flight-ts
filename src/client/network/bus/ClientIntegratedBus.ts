import type {UUID} from "../../../type/types.ts";
import type {ClientBus} from "./ClientBus.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {IntegratedBatchBufferPacket} from "../../../network/packet/common/IntegratedBatchBufferPacket.ts";
import {ClientIntegratedChannel} from "../channel/ClientIntegratedChannel.ts";

export class ClientIntegratedBus implements ClientBus {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private channel: ClientIntegratedChannel = null!;
    private ctrl: AbortController | null = null;

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
    }

    public getSessionId(): number {
        return 2;
    }

    public isConnected(): boolean {
        return this.ctrl !== null ? !this.ctrl.signal.aborted : false;
    }

    public setChannel(channel: ClientIntegratedChannel) {
        this.channel = channel;
    }

    public sendFrame(buff: Uint8Array<ArrayBuffer>) {
        this.worker.postMessage({
            type: 'packet',
            packet: buff.buffer
        }, {transfer: [buff.buffer]});
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
            this.worker.addEventListener('message', this.messageEvent.bind(this), {signal: limiter.signal});
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

    private messageEvent(event: MessageEvent): void {
        switch (event.data.type) {
            case 'payload': {
                const reader = new BinaryReader(new Uint8Array(event.data.packet));
                this.channel.feed(reader);
                return;
            }
            case 'batch' : {
                const {count, len, packet} = event.data;
                const buffer = new Uint8Array(packet, 0, len);
                const batch = new IntegratedBatchBufferPacket(count, buffer);
                this.channel.recv(batch);
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
}
