import type {UUID} from "../../../type/types.ts";
import type {ClientBus} from "./ClientBus.ts";
import type {SocketAddr} from "../../../network/SocketAddr.ts";
import type {Channel} from "../../../network/channel/Channel.ts";
import {parseUUID} from "../../../utils/uuid_util.ts";
import {BinaryReader} from "../../../serialization/BinaryReader.ts";
import {NetworkSide} from "../../../network/NetworkSide.ts";
import {PacketHeader} from "../../../network/PacketHeader.ts";
import {WebSocketBus} from "../../../network/WebSocketBus.ts";

export class ClientNetworkBus extends WebSocketBus implements ClientBus {
    protected readonly clientId: UUID;
    protected channel: Channel = null!;

    public constructor(address: SocketAddr, clientId: UUID) {
        super(NetworkSide.CLIENT, address);
        this.clientId = clientId;
    }

    public setChannel(channel: Channel) {
        this.channel = channel;
    }

    public sendBuffer(buff: Uint8Array<ArrayBuffer>) {
        this.send(buff);
    }

    protected override messageEvent(event: MessageEvent): void {
        const binary = new Uint8Array(event.data as ArrayBuffer);
        const reader = new BinaryReader(binary);
        this.channel.feed(reader);
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