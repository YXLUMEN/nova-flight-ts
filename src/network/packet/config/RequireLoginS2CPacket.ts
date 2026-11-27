import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ClientConfigHandler} from "../../../client/network/handler/ClientConfigHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {ConnectionState} from "../../../server/network/ConnectionState.ts";

export class RequireLoginS2CPacket implements Payload {
    public static readonly INSTANCE = new RequireLoginS2CPacket();
    public static readonly ID: PayloadType<RequireLoginS2CPacket> = payloadType('require_login');
    public static readonly CODEC: PacketCodec<RequireLoginS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<RequireLoginS2CPacket> {
        return RequireLoginS2CPacket.ID;
    }

    public accept(listener: ClientConfigHandler): void {
        void listener.onRequireLogin(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public protocol(): ConnectionState {
        return ConnectionState.CONFIGURATION;
    }
}