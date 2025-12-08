import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class MobAiS2CPacket implements Payload {
    public static readonly ID: PayloadId<MobAiS2CPacket> = {id: Identifier.ofVanilla('mob_ai')};
    public static readonly CODEC: PacketCodec<MobAiS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.VAR_UINT,
        val => val.entityId,
        PacketCodecs.INT8,
        val => val.behavior,
        MobAiS2CPacket.new
    );

    public readonly entityId: number;
    public readonly behavior: number;

    public constructor(id: number, behavior: number) {
        this.entityId = id;
        this.behavior = behavior;
    }

    public static new(id: number, behavior: number) {
        return new MobAiS2CPacket(id, behavior);
    }

    public getId(): PayloadId<MobAiS2CPacket> {
        return MobAiS2CPacket.ID;
    }
}