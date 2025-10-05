import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {UUID} from "../../apis/registry.ts";

export class PlayerAimC2SPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('player_aim');

    public static readonly CODEC: PacketCodec<PlayerAimC2SPacket> = PacketCodec.of<PlayerAimC2SPacket>(
        (value, writer) => {
            writer.writeString(value.uuid);
            PacketCodecs.VECTOR2D.encode(value.aim, writer);
        },
        (reader) => {
            const uuid = reader.readString() as UUID;
            const move = PacketCodecs.VECTOR2D.decode(reader);
            return new PlayerAimC2SPacket(uuid, move);
        }
    );

    public readonly uuid: UUID;
    public readonly aim: IVec;

    public constructor(uuid: UUID, aim: IVec) {
        this.uuid = uuid;
        this.aim = aim;
    }

    public getId(): Identifier {
        return PlayerAimC2SPacket.ID;
    }
}