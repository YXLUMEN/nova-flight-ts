import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class MissileSetS2CPacket implements Payload {
    public static readonly ID: PayloadId<MissileSetS2CPacket> = {id: Identifier.ofVanilla('missile_set')};
    public static readonly CODEC: PacketCodec<MissileSetS2CPacket> = PacketCodecs.of(
        (writer, value) => {
            writer.writeVarUInt(value.entityID);
            writer.writeFloat(value.driftAngle);
            writer.writeByte(value.hoverDir);
        },
        reader => {
            return new MissileSetS2CPacket(
                reader.readVarUInt(),
                reader.readFloat(),
                reader.readByte()
            )
        }
    );

    public readonly entityID: number;
    public readonly driftAngle: number;
    public readonly hoverDir: number;

    public constructor(entityID: number, driftAngle: number, hoverDir: number) {
        this.entityID = entityID;
        this.driftAngle = driftAngle;
        this.hoverDir = hoverDir;
    }

    public getId(): PayloadId<MissileSetS2CPacket> {
        return MissileSetS2CPacket.ID;
    }
}