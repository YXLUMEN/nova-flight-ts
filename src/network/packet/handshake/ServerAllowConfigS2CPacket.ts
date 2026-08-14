import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientHandshakeHandler} from "../../../client/network/handler/ClientHandshakeHandler.ts";

export class ServerAllowConfigS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerAllowConfigS2CPacket();
    public static readonly ID: PayloadType<ServerAllowConfigS2CPacket> = payloadType('server_allow_config');
    public static readonly CODEC: PacketCodec<ServerAllowConfigS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerAllowConfigS2CPacket> {
        return ServerAllowConfigS2CPacket.ID;
    }

    public accept(listener: ClientHandshakeHandler): void {
        listener.onAllowConfig?.(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}