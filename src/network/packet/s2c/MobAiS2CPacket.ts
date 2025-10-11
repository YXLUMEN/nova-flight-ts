import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class MobAiS2CPacket implements Payload {
    public static readonly ID: PayloadId<MobAiS2CPacket> = {id: Identifier.ofVanilla('mob_ai')};

    public static readonly CODEC: PacketCodec<MobAiS2CPacket> = PacketCodecs.of<MobAiS2CPacket>(
        (value, writer) => {
            writer.writeVarUInt(value.id);
            writer.writeByte(value.behavior);
        },
        (reader) => {
            return new MobAiS2CPacket(reader.readVarUInt(), reader.readByte());
        }
    );

    public readonly id: number;
    public readonly behavior: number;

    public constructor(id: number, behavior: number) {
        this.id = id;
        this.behavior = behavior;
    }

    public getId(): PayloadId<MobAiS2CPacket> {
        return MobAiS2CPacket.ID;
    }
}