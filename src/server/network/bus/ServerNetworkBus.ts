import type {SessionDispatcher} from "../SessionDispatcher.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ServerBus} from "./ServerBus.ts";
import type {GameProfile} from "../../entity/GameProfile.ts";
import type {SocketAddr} from "../../../network/SocketAddr.ts";
import {WebSocketBus} from "../../../network/WebSocketBus.ts";
import {NetworkSide} from "../../../network/NetworkSide.ts";
import {RingBuffer} from "../../../utils/collection/RingBuffer.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {Log} from "../../../worker/log.ts";
import {BatchBufferPacket} from "../../../network/packet/common/BatchBufferPacket.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PlayProtocol} from "../../../network/protocol/PlayProtocol.ts";
import type {PacketEncoder} from "../../../network/codec/PacketCodec.ts";
import {buildExcludes} from "../../../network/FrameUtil.ts";

export class ServerNetworkBus extends WebSocketBus implements ServerBus {
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(64);

    protected readonly batchSize = WebSocketBus.MAX_ESTIMATE;
    protected readonly out: PacketEncoder<Payload>;

    private dispatcher: SessionDispatcher = null!;
    private secretKey: Uint8Array | null;

    public constructor(address: SocketAddr, secretKey: Uint8Array) {
        super(NetworkSide.SERVER, address);
        this.secretKey = secretKey;
        this.out = PlayProtocol.SERVER_BOUND.codec;
    }

    public enqueue(payload: Payload): void {
        if (this.sendQueue.full()) this.flush();
        this.sendQueue.push(payload);
    }

    public broadcast(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);

        writer.writeInt8(PacketHeader.SERVER_BROADCAST);
        this.out.encode(writer, payload);
        this.send(writer.toUint8Array());
    }

    public exclude(payload: Payload, ...excludes: GameProfile[]) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 5 + excludes.length);

        buildExcludes(writer, excludes);
        this.out.encode(writer, payload);
        this.send(writer.toUint8Array());
    }

    public unicast(sid: number, frame: Uint8Array<ArrayBuffer>): void {
        if (frame[1] !== sid) throw new Error(`Unmatch sid, except "${sid}" but got "${frame[1]}"`);
        this.send(frame);
    }

    public action(buf: Uint8Array<ArrayBuffer>): void {
        if (!this.isConnected()) return;
        if (buf[0] !== PacketHeader.SERVER_ACTION) {
            throw new TypeError('Relay action packet must start with 0xFF')
        }
        this.send(buf);
    }

    public flush(): void {
        const size = this.sendQueue.getSize();
        if (size === 0) return;
        if (size === 1) {
            this.broadcast(this.sendQueue.shift()!);
            return;
        }

        const packets = BatchBufferPacket.create(this.sendQueue, this.out, this.batchSize);
        this.sendQueue.clear();
        for (const packet of packets) this.broadcast(packet);
    }

    public setDispatcher(dispatcher: SessionDispatcher) {
        this.dispatcher = dispatcher;
    }

    protected messageEvent(event: MessageEvent): void {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);

        const header = reader.readUint8();
        if (header === PacketHeader.RELAY) {
            this.dispatcher.relay(reader);
            return;
        }
        if (header !== PacketHeader.C2S) {
            Log.warn(`[Server] Receive unknown header "${header}"`);
            return;
        }

        const sid = reader.readUint8();
        this.dispatcher.dispatch(sid, reader);
    }

    protected register(): void {
        if (!this.secretKey) throw new Error(`[Server] Cannot register without a secret key`);

        const buf = new Uint8Array(1 + this.secretKey.length);
        buf[0] = PacketHeader.SERVER;
        buf.set(this.secretKey, 1);

        this.send(buf);
        console.log('Server registered');

        this.secretKey.fill(0);
        this.secretKey = null;
    }
}
