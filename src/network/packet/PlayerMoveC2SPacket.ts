import type {Payload} from "../Payload.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {PacketCodec} from "../codec/PacketCodec.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import {PacketCodecs} from "../codec/PacketCodecs.ts";

export class PlayerMoveC2SPacket implements Payload {
    public static readonly ID = Identifier.ofVanilla('player_move');

    public static readonly CODEC: PacketCodec<PlayerMoveC2SPacket> = PacketCodec.of<PlayerMoveC2SPacket>(
        (value, writer) => {
            PacketCodecs.VECTOR2D.encode(value.move, writer);
        },
        (reader) => {
            const move = PacketCodecs.VECTOR2D.decode(reader);
            return new PlayerMoveC2SPacket(move);
        }
    );

    public readonly move: IVec;

    public constructor(move: IVec) {
        this.move = move;
    }

    public getId(): Identifier {
        return PlayerMoveC2SPacket.ID;
    }
}