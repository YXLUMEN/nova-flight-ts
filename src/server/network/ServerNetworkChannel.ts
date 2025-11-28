import {NetworkChannel} from "../../network/NetworkChannel.ts";
import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import type {Payload} from "../../network/Payload.ts";
import type {Consumer, UUID} from "../../apis/types.ts";
import {BinaryWriter} from "../../nbt/BinaryWriter.ts";
import type {IServerPlayNetwork} from "./IServerPlayNetwork.ts";
import {BinaryReader} from "../../nbt/BinaryReader.ts";
import {RelayServerPacket} from "../../network/packet/RelayServerPacket.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {PayloadWithOrigin} from "../../network/codec/PayloadWithOrigin.ts";

export class ServerNetworkChannel extends NetworkChannel implements IServerPlayNetwork {
    private readonly secretKey: Uint8Array;
    private handler: Consumer<PayloadWithOrigin> | null = null;

    public constructor(address: string, secretKey: Uint8Array) {
        super(address, PayloadTypeRegistry.playS2C());
        this.secretKey = secretKey;
    }

    public sendTo<T extends Payload>(payload: T, target: UUID) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeByte(0x12);
        writer.writeByte(this.getSessionID());
        writer.writeUUID(target);

        writer.writeString(type.id.toString());
        type.codec.encode(writer, payload);

        this.ws!.send(writer.toUint8Array());
    }

    public sendExclude<T extends Payload>(payload: T, ...excludes: UUID[]) {
        const type = this.registry.get(payload.getId().id);
        if (!type) throw new Error(`Unknown payload type: ${payload.getId().id}`);

        const writer = new BinaryWriter();
        writer.writeByte(0x13);
        writer.writeByte(this.getSessionID());

        writer.writeVarUInt(excludes.length);
        for (const id of excludes) {
            writer.writeUUID(id);
        }

        writer.writeString(type.id.toString());
        type.codec.encode(writer, payload);

        this.ws!.send(writer.toUint8Array());
    }

    private decodeWithOrigin(buf: Uint8Array): PayloadWithOrigin | null {
        const reader = new BinaryReader(buf);

        const header = reader.readByte();
        if (header === 0x00) {
            return {sessionId: 0, payload: RelayServerPacket.CODEC.decode(reader)}
        }
        if (header !== 0x10) {
            console.warn(`${this.getSide().toUpperCase()} -> Unknown header: ${header}`);
            return null;
        }

        const sessionId = reader.readUnsignByte();
        const idStr = reader.readString();
        const id = Identifier.tryParse(idStr);
        if (!id) return null;

        const type = PayloadTypeRegistry.getGlobal(id);
        if (!type) return null;

        const payload = type.codec.decode(reader);
        return {sessionId, payload};
    }

    protected override handleMessage(event: MessageEvent) {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const payload = this.decodeWithOrigin(binary);
        if (payload && this.handler) this.handler(payload);
    }

    public setHandler(handler: Consumer<PayloadWithOrigin>) {
        this.handler = handler;
    }

    public override clearHandlers() {
        this.handler = null;
    }

    protected override getSide() {
        return 'server';
    }

    protected override getHeader() {
        return 0x11;
    }

    protected register() {
        const payload = new Uint8Array(1 + this.secretKey.length);
        payload[0] = 0x01;
        payload.set(this.secretKey, 1);

        this.ws!.send(payload);
        console.log("Server registered");
    }
}