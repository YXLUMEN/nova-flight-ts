import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientConfigHandler} from "../../../client/network/handler/ClientConfigHandler.ts";

export class ServerFinishConfigS2CPacket implements Payload {
    public static readonly INSTANCE = new ServerFinishConfigS2CPacket();
    public static readonly ID: PayloadType<ServerFinishConfigS2CPacket> = payloadType('server_finish_config');
    public static readonly CODEC: PacketCodec<ServerFinishConfigS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<ServerFinishConfigS2CPacket> {
        return ServerFinishConfigS2CPacket.ID;
    }

    public accept(listener: ClientConfigHandler): void {
        listener.onFinishConfig?.(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public canProcessInTransition(): boolean {
        return true;
    }
}