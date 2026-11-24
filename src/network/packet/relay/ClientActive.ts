import type {RelayPayload} from "../../RelayPayload.ts";
import type {ServerRelayHandler} from "../../../server/network/handler/ServerRelayHandler.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {empty} from "../../../utils/util.ts";

export class ClientActive implements RelayPayload {
    public static readonly ID: PayloadType<ClientActive> = payloadType('client_active');
    public static readonly CODEC: PacketCodec<ClientActive> = PacketCodecs.of(
        empty,
        reader => new ClientActive(
            reader.readUint8(),
            PacketCodecs.IPV4.decode(reader),
            reader.readUint16(),
        )
    );

    public readonly sid: number;
    public readonly host: string;
    public readonly port: number;

    private constructor(sid: number, host: string, port: number) {
        this.sid = sid;
        this.host = host;
        this.port = port;
    }

    public type(): PayloadType<ClientActive> {
        return ClientActive.ID;
    }

    public accept(listener: ServerRelayHandler): void {
        listener.onClientActive(this);
    }
}