import type {Payload} from "../../network/Payload.ts";
import type {ServerBus} from "./ServerBus.ts";
import type {SessionDispatcher} from "./SessionDispatcher.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {ProtocolInfo} from "../../network/protocol/ProtocolInfo.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {IntegratedBatchBufferPacket} from "../../network/packet/common/IntegratedBatchBufferPacket.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {PlayProtocol} from "../../network/protocol/PlayProtocol.ts";

export class ServerIntegratedBus implements ServerBus {
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(48);
    private readonly out: ProtocolInfo = PlayProtocol.SERVER_BOUND;

    private dispatcher: SessionDispatcher = null!;
    private ctrl = new AbortController();

    public getSessionId(): number {
        return 1;
    }

    public isConnected(): boolean {
        return true;
    }

    public enqueue(payload: Payload) {
        if (this.sendQueue.full()) this.flush();
        this.sendQueue.push(payload);
    }

    public broadcast(payload: Payload) {
        this.broadWith(payload, this.out);
    }

    public broadWith(payload: Payload, protocol: ProtocolInfo) {
        const size = payload.estimateSize?.() ?? 62;
        const writer = new BinaryWriter(size + 2);
        protocol.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        self.postMessage({
            type: 'broadcast',
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public exclude(payload: Payload, ...excludes: GameProfile[]) {
        if (excludes.some(v => v.sessionId === 2)) return;
        this.broadcast(payload);
    }

    public unicast(_sid: number, frame: Uint8Array<ArrayBuffer>) {
        self.postMessage({
            type: 'unicast',
            packet: frame.buffer
        }, {transfer: [frame.buffer]});
    }

    public action(): void {
    }

    public flush() {
        const size = this.sendQueue.getSize();
        if (size === 0) return;
        if (size === 1) {
            this.broadcast(this.sendQueue.shift()!);
            return;
        }

        const batches = IntegratedBatchBufferPacket.create(this.sendQueue, this.out.codec);
        this.sendQueue.clear();
        for (const {payloadCount, buffer} of batches) {
            self.postMessage({
                type: 'batch',
                count: payloadCount,
                len: buffer.length,
                packet: buffer.buffer
            }, {transfer: [buffer.buffer]});
        }
    }

    public connect(): Promise<void> {
        self.addEventListener('message', this.onMessage.bind(this), {signal: this.ctrl.signal});
        return Promise.resolve();
    }

    public disconnect(): void {
        this.ctrl.abort();
        this.ctrl = new AbortController();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public setDispatcher(dispatcher: SessionDispatcher) {
        this.dispatcher = dispatcher;
    }

    private receivePacket(buf: ArrayBuffer): void {
        const reader = new BinaryReader(new Uint8Array(buf));
        this.dispatcher.dispatch(2, reader);
    }

    private onMessage(event: MessageEvent): void {
        const type = event.data.type;
        switch (type) {
            case 'connect': {
                self.postMessage({type: 'connect'});
                break;
            }
            case 'disconnect': {
                this.disconnect();
                break;
            }
            case 'sniff': {
                self.postMessage({type: 'sniff'});
                break;
            }
            case 'packet': {
                this.receivePacket(event.data.packet);
                break;
            }
        }
    }
}
