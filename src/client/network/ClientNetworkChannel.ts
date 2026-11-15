import type {UUID} from "../../type/types.ts";
import type {ChannelHandler} from "../../network/channel/ChannelHandler.ts";
import type {Payload} from "../../network/Payload.ts";
import type {ProtocolInfo} from "../../network/protocol/ProtocolInfo.ts";
import type {ClientChannel} from "./ClientChannel.ts";
import {parseUUID} from "../../utils/uuid_util.ts";
import {BinaryReader} from "../../serialization/BinaryReader.ts";
import {HandshakeProtocols} from "../../network/protocol/HandshakeProtocols.ts";
import {NetworkSide} from "../../network/NetworkSide.ts";
import {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {PacketHeader} from "../../network/PacketHeader.ts";
import {WebSocketBus} from "../../network/WebSocketBus.ts";

export class ClientNetworkChannel extends WebSocketBus implements ClientChannel {
    private readonly clientId: UUID;

    private handler: ChannelHandler = null!;
    private in: ProtocolInfo = HandshakeProtocols.SERVER_BOUND;
    private out: ProtocolInfo = HandshakeProtocols.CLIENT_BOUND;

    public constructor(address: string, clientId: UUID) {
        super(NetworkSide.CLIENT, address);
        this.clientId = clientId;
    }

    public isOpen(): boolean {
        return this.isConnected();
    }

    public setHandler(handler: ChannelHandler): void {
        this.handler = handler;
    }

    public clearHandler(): void {
        this.handler = null!;
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
        this.send(writer.toUint8Array());
    }

    public unicast(payload: Payload): void {
        this.broadcast(payload);
    }

    public onMessage(reader: BinaryReader): void {
        let payload: Payload;
        try {
            payload = this.in.codec.decode(reader);
        } catch (err) {
            this.handler.report(err);
            return;
        }

        this.handler.recv(payload);
    }

    protected override messageEvent(event: MessageEvent): void {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);

        const header = reader.readUint8();
        switch (header) {
            case PacketHeader.RELAY:
                return;
            case PacketHeader.SERVER_BROADCAST:
                // 服务端广播会忽视单客户端连接状况,所以得跳过
                const protocol = reader.readUint8();
                if (protocol !== this.in.protocol) return;
                this.onMessage(reader);
                return;
            case PacketHeader.SERVER_SINGLE:
                reader.skip(1);
                this.onMessage(reader);
                return;
        }
        console.warn(`[Client] Unknown header: ${header}`);
    }

    protected override register(): void {
        const uuid = parseUUID(this.clientId);
        const buf = new Uint8Array(1 + uuid.length);
        buf[0] = PacketHeader.CLIENT;
        buf.set(uuid, 1);

        this.send(buf);
        console.log(`Client ${this.clientId} registered`);
    }
}