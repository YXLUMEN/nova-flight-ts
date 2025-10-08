import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerMoveC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveC2SPacket> = {id: Identifier.ofVanilla('player_move')};

    public static readonly CODEC: PacketCodec<PlayerMoveC2SPacket> = PacketCodec.of<PlayerMoveC2SPacket>(
        (value, writer) => {
            writer.writeUUID(value.uuid);
            writer.writeInt8(value.dx);
            writer.writeInt8(value.dy);
        },
        (reader) => {
            return new PlayerMoveC2SPacket(reader.readUUID(), reader.readInt8(), reader.readInt8());
        }
    );

    public readonly uuid: UUID;
    public readonly dx: number;
    public readonly dy: number;

    public constructor(uuid: UUID, dx: number, dy: number) {
        this.uuid = uuid;
        this.dx = dx;
        this.dy = dy;
    }

    public getId(): PayloadId<PlayerMoveC2SPacket> {
        return PlayerMoveC2SPacket.ID;
    }
}