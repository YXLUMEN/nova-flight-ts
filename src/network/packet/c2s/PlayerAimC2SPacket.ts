import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {IVec} from "../../../utils/math/IVec.ts";
import type {UUID} from "../../../apis/types.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";

export class PlayerAimC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerAimC2SPacket> = {id: Identifier.ofVanilla('player_aim')};

    public static readonly CODEC: PacketCodec<PlayerAimC2SPacket> = PacketCodecs.of<PlayerAimC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.uuid);
            PacketCodecs.VECTOR2D.encode(writer, value.aim);
        },
        (reader) => {
            const uuid = reader.readUUID();
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

    public getId(): PayloadId<PlayerAimC2SPacket> {
        return PlayerAimC2SPacket.ID;
    }
}