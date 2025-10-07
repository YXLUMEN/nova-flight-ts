import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";

export class MobAiS2CPacket implements Payload {
    public static readonly ID: PayloadId<MobAiS2CPacket> = {id: Identifier.ofVanilla('mob_ai')};

    public static readonly CODEC: PacketCodec<MobAiS2CPacket> = PacketCodec.of<MobAiS2CPacket>(
        (value, writer) => {
            writer.writeVarInt(value.id);
            writer.writeInt8(value.behavior);
        },
        (reader) => {
            return new MobAiS2CPacket(reader.readVarInt(), reader.readInt8());
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