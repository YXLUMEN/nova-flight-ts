import type {UUID} from "../../type/types.ts";
import type {Payload} from "../../network/Payload.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import type {ProtocolInfo} from "../../network/protocol/ProtocolInfo.ts";
import type {ChannelHandler} from "../../network/channel/ChannelHandler.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {IntegratedBatchBufferPacket} from "../../network/packet/common/IntegratedBatchBufferPacket.ts";
import {HandshakeProtocols} from "../../network/protocol/HandshakeProtocols.ts";

export class ClientIntegratedChannel implements ClientChannel {
    private readonly clientId: UUID;
    private readonly worker: Worker;

    private handler: ChannelHandler = null!;
    private in: PacketCodec<Payload> = HandshakeProtocols.SERVER_BOUND.codec;
    private out: PacketCodec<Payload> = HandshakeProtocols.CLIENT_BOUND.codec;
    private ctrl: AbortController | null = null;

    public constructor(worker: Worker, clientId: UUID) {
        this.worker = worker;
        this.clientId = clientId;
    }

    public getSessionId(): number {
        return 2;
    }

    public isOpen(): boolean {
        return this.ctrl !== null ? !this.ctrl.signal.aborted : false;
    }

    public setHandler(handler: ChannelHandler): void {
        this.handler = handler;
    }

    public clearHandler(): void {
        this.handler = null!;
    }

    public inbound(protocol: ProtocolInfo): void {
        this.in = protocol.codec;
    }

    public outbound(protocol: ProtocolInfo): void {
        this.out = protocol.codec;
    }

    public broadcast(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 6;
        const writer = new BinaryWriter(size + 2);
        this.out.encode(writer, payload);

        const buffer = writer.toUint8Array();
        this.worker.postMessage({
            type: 'packet',
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public unicast(payload: Payload): void {
        this.broadcast(payload);
    }

    public onMessage(reader: BinaryReader): void {
        let payload: Payload;
        try {
            payload = this.in.decode(reader);
        } catch (err) {
            this.handler.report(err);
            return;
        }
        this.handler.recv(payload);
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
            case 'broadcast': {
                const reader = new BinaryReader(new Uint8Array(event.data.packet));
                this.onMessage(reader);
                return;
            }
            case 'unicast' : {
                const reader = new BinaryReader(new Uint8Array(event.data.packet));
                reader.skip(2);
                this.onMessage(reader);
                return;
            }
            case 'batch' : {
                const {count, len, packet} = event.data;
                const buffer = new Uint8Array(packet, 0, len);
                const batch = new IntegratedBatchBufferPacket(count, buffer);
                this.handler.recv(batch);
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
