import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {UUID} from "../../../apis/registry.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerMoveC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveC2SPacket> = {id: Identifier.ofVanilla('player_move')};

    public static readonly CODEC: PacketCodec<PlayerMoveC2SPacket> = PacketCodecs.of<PlayerMoveC2SPacket>(
        (writer, value) => {
            writer.writeUUID(value.uuid);
            writer.writeByte(value.dx);
            writer.writeByte(value.dy);
        },
        (reader) => {
            return new PlayerMoveC2SPacket(reader.readUUID(), reader.readByte(), reader.readByte());
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