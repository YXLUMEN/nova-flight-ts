import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../apis/types.ts";
import {decodeVelocity} from "../../../utils/NetUtil.ts";

export class PlayerMoveByPointerC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveByPointerC2SPacket> = {id: Identifier.ofVanilla('player_vec_move')};

    public static readonly CODEC: PacketCodec<PlayerMoveByPointerC2SPacket> = PacketCodecs.of<PlayerMoveByPointerC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.uuid);
            writer.writeInt16(value.dxInt16);
            writer.writeInt16(value.dyInt16);
        },
        (reader) => {
            return new PlayerMoveByPointerC2SPacket(reader.readUUID(), reader.readInt16(), reader.readInt16());
        }
    );

    public readonly uuid: UUID;
    private readonly dxInt16: number;
    private readonly dyInt16: number;

    public constructor(uuid: UUID, dxInt16: number, dyInt6: number) {
        this.uuid = uuid;
        this.dxInt16 = dxInt16;
        this.dyInt16 = dyInt6;
    }

    public getId(): PayloadId<PlayerMoveByPointerC2SPacket> {
        return PlayerMoveByPointerC2SPacket.ID;
    }

    public get dx() {
        return decodeVelocity(this.dxInt16);
    }

    public get dy() {
        return decodeVelocity(this.dyInt16);
    }
}