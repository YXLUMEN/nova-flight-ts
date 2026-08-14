import {WSNetworkChannel} from "../../network/WSNetworkChannel.ts";
import {CodecRegistry} from "../../network/CodecRegistry.ts";
import type {Payload} from "../../network/Payload.ts";
import type {BiConsumer} from "../../type/types.ts";
import type {ServerChannel} from "./ServerChannel.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {GameProfile} from "../entity/GameProfile.ts";
import {empty} from "../../utils/uit.ts";
import {PacketHeader} from "../../network/PacketHeader.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {RingBuffer} from "../../utils/collection/RingBuffer.ts";
import {BatchBufferPacket} from "../../network/packet/common/BatchBufferPacket.ts";

export class ServerNetworkChannel extends WSNetworkChannel implements ServerChannel {
    private readonly sendQueue = new RingBuffer<Payload>(48);
    private secretKey: Uint8Array | null;
    private handler: BiConsumer<number, Payload> = empty;

    public constructor(address: string, secretKey: Uint8Array) {
        super(NetworkSide.SERVER, address, CodecRegistry.S2C);
        this.secretKey = secretKey;
    }

    /**
     * 触发中继服务器操作
     * 必须由 0xFF 开头
     * */
    public action(buffer: Uint8Array<ArrayBuffer>) {
        if (!this.isConnected()) return;

        if (buffer[0] !== PacketHeader.SERVER_ACTION) {
            console.warn('Relay action packet must start with 0xFF');
            return;
        }

        this.sendRaw(buffer);
    }

    public send(payload: Payload): void {
        const type = this.registry.get(payload.type());
        if (!type) throw new Error(`[${this.side}] Unknown payload type: ${payload.type().id}`);

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.SERVER_BROADCAST);
        writer.writeInt8(0);

        this.checkAndSend(writer, type, payload);
    }

    public enqueue(payload: Payload): void {
        if (this.sendQueue.full()) this.flush();
        this.sendQueue.push(payload);
    }

    public flush(): void {
        if (this.sendQueue.isEmpty()) return;
        const packets = BatchBufferPacket.create(this.sendQueue, this.registry);
        this.sendQueue.clear();
        for (const packet of packets) this.send(packet);
    }

    public sendTo<T extends Payload>(payload: T, target: GameProfile): void {
        this.sendToId(payload, target.sessionId);
    }

    public sendToId<T extends Payload>(payload: T, target: number): void {
        const codec = this.registry.get(payload.type());
        if (!codec) throw new Error(`[Server] Unknown payload type: ${payload.type().id}`);

        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.SERVER_SINGLE);
        writer.writeInt8(target);
        this.checkAndSend(writer, codec, payload);
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: GameProfile[]): void {
        const codec = this.registry.get(payload.type());
        if (!codec) throw new Error(`[Server] Unknown payload type: ${payload.type().id}`);

        const writer = new BinaryWriter();
        writer.writeInt8(PacketHeader.SERVER_EXCLUDE);
        writer.writeInt8(this.getSessionId());

        writer.writeVarUint(excludes.length);
        for (const session of excludes) {
            writer.writeInt8(session.sessionId);
        }
        this.checkAndSend(writer, codec, payload);
    }

    protected override handleMessage(event: MessageEvent): void {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);

        const header = reader.readUint8();
        if (header === PacketHeader.RELAY) {
            const index = reader.readUint8();
            const codec = CodecRegistry.idBy(index);
            if (codec) this.handler(0, codec.codec.decode(reader));
            return;
        }
        if (header !== PacketHeader.C2S) {
            console.warn(`[${this.side}] Unknown header: ${header}`);
            return;
        }

        const sessionId = reader.readUint8();
        const index = reader.readVarUint();
        const codec = CodecRegistry.idBy(index);
        if (!codec) return;

        this.handler(sessionId, codec.codec.decode(reader));
    }

    public setHandler(handler: BiConsumer<number, Payload>) {
        this.handler = handler;
    }

    public override clearHandlers(): void {
        this.handler = empty;
    }

    protected register() {
        if (!this.secretKey) throw new Error(`Cannot register without a secret key`);

        const buf = new Uint8Array(1 + this.secretKey.length);
        buf[0] = PacketHeader.SERVER;
        buf.set(this.secretKey, 1);

        this.sendRaw(buf);
        console.log('Server registered');

        this.secretKey.fill(0);
        this.secretKey = null;
    }
}