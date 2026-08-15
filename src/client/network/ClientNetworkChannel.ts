import {WSNetworkChannel} from "../../network/WSNetworkChannel.ts";
import {CodecRegistry} from "../../network/CodecRegistry.ts";
import type {Consumer, UUID} from "../../type/types.ts";
import {UUIDUtil} from "../../utils/UUIDUtil.ts";
import type {Payload} from "../../network/Payload.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import {empty} from "../../utils/uit.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {PacketHeader} from "../../network/PacketHeader.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class ClientNetworkChannel extends WSNetworkChannel implements ClientChannel {
    private readonly clientId: UUID;
    private handler: Consumer<Payload> = empty;

    public constructor(url: string, clientId: UUID) {
        super(NetworkSide.CLIENT, url, CodecRegistry.C2S);
        this.clientId = clientId;
    }

    public send(payload: Payload) {
        const type = this.registry.get(payload.type());
        if (!type) throw new Error(`[${this.side}] Unknown payload type: ${payload.type().id}`);

        const size = payload.estimateSize?.() ?? 7;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.C2S);
        writer.writeInt8(this.getSessionId());

        this.checkAndSend(writer, type, payload);
    }

    protected override handleMessage(event: MessageEvent): void {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);

        const header = reader.readUint8();
        if (header === PacketHeader.RELAY) {
            const index = reader.readUint8();
            const codec = CodecRegistry.byId(index);
            if (codec) this.handler(codec.codec.decode(reader));
            return;
        }

        if (header !== PacketHeader.SERVER_BROADCAST && header !== PacketHeader.SERVER_SINGLE) {
            console.warn(`[${this.side}] Unknown header: ${header}`);
            return;
        }

        reader.readUint8();
        const index = reader.readVarUint();
        const codec = CodecRegistry.byId(index);
        if (!codec) return;

        this.handler(codec.codec.decode(reader));
    }

    public setHandler(handler: Consumer<Payload>): void {
        this.handler = handler;
    }

    public override clearHandlers(): void {
        this.handler = empty;
    }

    protected override register(): void {
        const uuid = UUIDUtil.parse(this.clientId);
        const buf = new Uint8Array(1 + uuid.length);
        buf[0] = PacketHeader.CLIENT;
        buf.set(uuid, 1);

        this.sendRaw(buf);
        console.log(`Client ${this.clientId} registered`);
    }
}
