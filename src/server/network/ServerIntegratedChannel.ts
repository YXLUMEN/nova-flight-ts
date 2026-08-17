import type {Payload} from "../../network/Payload.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {BiConsumer} from "../../type/types.ts";
import {CodecRegistry} from "../../network/CodecRegistry.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {empty} from "../../utils/uit.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {IntegratedBatchBufferPacket} from "../../network/packet/common/IntegratedBatchBufferPacket.ts";

export class ServerIntegratedChannel implements ServerChannel {
    private readonly registry = CodecRegistry.S2C;
    private readonly sendQueue = new RingBuffer<Payload>(48);

    private clientId: number = 2;
    private ctrl = new AbortController();
    private handler: BiConsumer<number, Payload> = empty;

    public constructor() {
        this.onMessage = this.onMessage.bind(this);
    }

    public getSessionId(): number {
        return 1;
    }

    public isConnected(): boolean {
        return !this.ctrl.signal.aborted;
    }

    public send(payload: Payload): void {
        const codec = this.registry.get(payload.type());
        if (!codec) throw new Error(`Unknown payload type: ${payload.type().id}`);

        const size = payload.estimateSize?.() ?? 62;
        const writer = new BinaryWriter(size + 2);
        writer.writeVarUint(codec.index);
        codec.codec.encode(writer, payload);

        const buffer = writer.toUint8Array();
        self.postMessage({
            type: 'packet',
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});
    }

    public enqueue(payload: Payload) {
        if (this.sendQueue.full()) this.flush();
        this.sendQueue.push(payload);
    }

    public flush() {
        // 集成模式下,合并不是必须的
        if (this.sendQueue.isEmpty()) return;
        const {payloadCount, buffer} = IntegratedBatchBufferPacket.create(this.sendQueue, this.registry);
        this.sendQueue.clear();

        self.postMessage({
            type: 'batch',
            count: payloadCount,
            len: buffer.length,
            packet: buffer.buffer
        }, {transfer: [buffer.buffer]});

        // console.assert(buffer.buffer.detached, '未分离的 buffer');
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        this.sendToId(payload, target.sessionId);
    }

    public sendToId<T extends Payload>(payload: T, target: number): void {
        if (target !== this.clientId) return;
        this.send(payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        if (excludes.some(p => p.sessionId === this.clientId)) return;
        this.send(payload);
    }

    public action(): void {
    }

    public connect(): Promise<void> {
        self.addEventListener("message", this.onMessage, {signal: this.ctrl.signal});
        return Promise.resolve();
    }

    public disconnect(): void {
        this.ctrl.abort();
        this.ctrl = new AbortController();
        this.clearHandlers();
    }

    public sniff(): Promise<boolean> {
        return Promise.resolve(true);
    }

    private receivePacket(buf: ArrayBuffer): void {
        const reader = new BinaryReader(new Uint8Array(buf));

        const index = reader.readVarUint();
        const codec = CodecRegistry.byId(index);
        if (!codec) return;

        this.handler(this.clientId, codec.codec.decode(reader));
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

    public setHandler(handler: BiConsumer<number, Payload>): void {
        this.handler = handler;
    }

    public clearHandlers(): void {
        this.handler = empty;
    }

    public setRemote(): void {
    }
}
