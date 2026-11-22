import type {Channel} from "../../../network/channel/Channel.ts";
import type {ProtocolInfo} from "../../../network/protocol/ProtocolInfo.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {Egress} from "../bus/Egress.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {PacketCodec} from "../../../network/codec/PacketCodec.ts";
import type {ChannelHandler} from "../../../network/channel/ChannelHandler.ts";
import {RelayActionBuilder} from "../RelayActionBuilder.ts";
import {HandshakeProtocols} from "../../../network/protocol/HandshakeProtocols.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";

export class SessionChannel implements Channel {
    protected readonly bus: Egress;
    protected readonly sid: number;
    protected opened = true;
    protected handler: ChannelHandler = null!;

    protected in: PacketCodec<Payload> = HandshakeProtocols.CLIENT_BOUND.codec;
    protected out: PacketCodec<Payload> = HandshakeProtocols.SERVER_BOUND.codec;

    public constructor(bus: Egress, sid: number) {
        this.bus = bus;
        this.sid = sid;
    }

    public isOpen(): boolean {
        return this.opened;
    }

    public getSessionId(): number {
        return this.sid;
    }

    public setHandler(handler: ChannelHandler) {
        this.handler = handler;
    }

    public inbound(protocol: ProtocolInfo) {
        this.in = protocol.codec;
    }

    public outbound(protocol: ProtocolInfo) {
        this.out = protocol.codec;
    }

    public broadcast(payload: Payload) {
        this.bus.enqueue(payload);
    }

    public unicast(payload: Payload) {
        const size = payload.estimateSize?.() ?? 60;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.SERVER_SINGLE);
        writer.writeInt8(this.sid);
        this.out.encode(writer, payload);
        this.bus.unicast(this.sid, writer.toUint8Array());
    }

    /** @readonly 立刻用当前解析器反序列化 */
    public directly(reader: BinaryReader): Payload | null {
        try {
            return this.in.decode(reader);
        } catch (err) {
            this.handler.report(err);
            return null;
        }
    }

    public onMessage(reader: BinaryReader) {
        let payload: Payload;
        try {
            payload = this.in.decode(reader);
        } catch (err) {
            this.handler.report(err);
            return;
        }
        this.handler.recv(payload);
    }

    public disconnect() {
        this.opened = false;
        this.bus.action(RelayActionBuilder.forceDisconnect(this.sid));
    }
}