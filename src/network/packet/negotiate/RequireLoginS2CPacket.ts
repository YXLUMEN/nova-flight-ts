import type {Payload} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import type {ClientNegotiateHandler} from "../../../client/network/handler/ClientNegotiateHandler.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class RequireLoginS2CPacket implements Payload {
    public static readonly INSTANCE = new RequireLoginS2CPacket();
    public static readonly ID: PayloadType<RequireLoginS2CPacket> = payloadType('require_login');
    public static readonly CODEC: PacketCodec<RequireLoginS2CPacket> = PacketCodecs.uint(this.INSTANCE);

    private constructor() {
    }

    public type(): PayloadType<RequireLoginS2CPacket> {
        return RequireLoginS2CPacket.ID;
    }

    public accept(listener: ClientNegotiateHandler): void {
        void listener.onRequireLogin(this);
    }

    public estimateSize(): number {
        return 0;
    }

    public inTransition(): boolean {
        return true;
    }
}