import type {Channel} from "../../../network/channel/Channel.ts";
import type {ChannelHandler} from "../../../network/channel/ChannelHandler.ts";
import type {Payload} from "../../../network/Payload.ts";
import type {ProtocolInfo} from "../../../network/protocol/ProtocolInfo.ts";
import type {BinaryReader} from "../../../serialization/BinaryReader.ts";
import type {ClientBus} from "../bus/ClientBus.ts";
import {HandshakeProtocols} from "../../../network/protocol/HandshakeProtocols.ts";
import {BinaryWriter} from "../../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class ClientChannel implements Channel {
    public bus: ClientBus = null!;

    protected handler: ChannelHandler = null!;
    protected in: ProtocolInfo = HandshakeProtocols.SERVER_BOUND;
    protected out: ProtocolInfo = HandshakeProtocols.CLIENT_BOUND;

    public isOpen(): boolean {
        return this.bus.isConnected();
    }

    public getSessionId(): number {
        return this.bus.getSessionId();
    }

    public setHandler(handler: ChannelHandler): void {
        this.handler = handler;
    }

    public inbound(protocol: ProtocolInfo): void {
        this.in = protocol;
    }

    public outbound(protocol: ProtocolInfo): void {
        this.out = protocol;
    }

    public broadcast(payload: Payload): void {
        const size = payload.estimateSize?.() ?? 7;
        const writer = new BinaryWriter(size + 4);
        writer.writeInt8(PacketHeader.C2S);
        writer.writeInt8(this.getSessionId());
        this.out.codec.encode(writer, payload);
        this.bus.sendBuffer(writer.toUint8Array());
    }

    public unicast(payload: Payload): void {
        this.broadcast(payload);
    }

    public onMessage(reader: BinaryReader): void {
        const header = reader.readUint8();
        switch (header) {
            case PacketHeader.RELAY:
                return;
            case PacketHeader.SERVER_BROADCAST:
                // 服务端广播仅在 PLAY 阶段有效
                reader.skip(1);
                if (this.in.protocol !== ConnectionState.PLAY) return;
                this.decode(reader);
                return;
            case PacketHeader.SERVER_SINGLE:
                reader.skip(1);
                this.decode(reader);
                return;
        }
        console.warn(`[Client] Unknown header: ${header}`);
    }

    protected decode(reader: BinaryReader) {
        let payload: Payload;
        try {
            payload = this.in.codec.decode(reader);
        } catch (err) {
            this.handler.report(err);
            return;
        }

        this.handler.recv(payload);
    }

    public disconnect(): void {
        this.bus.disconnect();
    }
}