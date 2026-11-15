import type {SessionDispatcher} from "./SessionDispatcher.ts";
import type {Payload} from "../../network/Payload.ts";
import type {ServerBus} from "./ServerBus.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import type {ProtocolInfo} from "../../network/protocol/ProtocolInfo.ts";
import {WebSocketBus} from "../../network/WebSocketBus.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {PacketHeader} from "../../network/PacketHeader.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {Log} from "../../worker/log.ts";
import {BatchBufferPacket} from "../../network/packet/common/BatchBufferPacket.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {PlayProtocol} from "../../network/protocol/PlayProtocol.ts";

export class ServerNetworkBus extends WebSocketBus implements ServerBus {
    private readonly sendQueue: RingBuffer<Payload> = new RingBuffer(64);
    private readonly out: ProtocolInfo;

    private dispatcher: SessionDispatcher = null!;
    private secretKey: Uint8Array | null;

    public constructor(address: string, secretKey: Uint8Array) {
        super(NetworkSide.SERVER, address);
        this.secretKey = secretKey;
        this.out = PlayProtocol.SERVER_BOUND;
    }

    public enqueue(payload: Payload): void {
        if (this.sendQueue.full()) this.flush();
        this.sendQueue.push(payload);
    }

    public broadcast(payload: Payload): void {
        this.broadWith(payload, this.out);
    }

    public broadWith(payload: Payload, protocol: ProtocolInfo) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.SERVER_BROADCAST);
        writer.writeInt8(protocol.protocol);
        protocol.codec.encode(writer, payload);
        this.send(writer.toUint8Array());
    }

    public exclude(payload: Payload, ...excludes: GameProfile[]) {
        const writer = new BinaryWriter();
        writer.writeInt8(PacketHeader.SERVER_EXCLUDE);
        writer.writeInt8(this.getSessionId());

        writer.writeVarUint(excludes.length);
        for (const session of excludes) {
            writer.writeInt8(session.sessionId);
        }
        this.out.codec.encode(writer, payload);
        this.send(writer.toUint8Array())
    }

    public unicast(sid: number, frame: Uint8Array<ArrayBuffer>): void {
        if (frame[1] !== sid) throw new Error();
        this.send(frame);
    }

    public action(buf: Uint8Array<ArrayBuffer>): void {
        if (!this.isConnected()) return;

        if (buf[0] !== PacketHeader.SERVER_ACTION) {
            Log.warn('Relay action packet must start with 0xFF');
            return;
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

        const packets = BatchBufferPacket.create(this.sendQueue, this.out.codec);
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
