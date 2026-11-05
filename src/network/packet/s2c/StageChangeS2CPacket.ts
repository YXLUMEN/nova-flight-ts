import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class StageChangeS2CPacket implements Payload {
    public static readonly ID: PayloadType<StageChangeS2CPacket> = payloadType('stage_change');
    public static readonly CODEC: PacketCodec<StageChangeS2CPacket> = PacketCodecs.adapt(
        PacketCodecs.STRING,
        val => val.stage,
        val => new StageChangeS2CPacket(val)
    );

    public readonly stage: string;

    public constructor(stage: string) {
        this.stage = stage;
    }

    public type(): PayloadType<StageChangeS2CPacket> {
        return StageChangeS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onStageChange(this);
    }
}