import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerMoveC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerMoveC2SPacket> = {id: Identifier.ofVanilla('player_move')};

    public static readonly CODEC: PacketCodec<PlayerMoveC2SPacket> = PacketCodec.of<PlayerMoveC2SPacket>(
        (value, writer) => {
            writer.writeString(value.uuid);
            writer.writeDouble(value.velocityX);
            writer.writeDouble(value.velocityY);
        },
        (reader) => {
            return new PlayerMoveC2SPacket(reader.readString() as UUID, reader.readDouble(), reader.readDouble());
        }
    );

    public readonly uuid: UUID;
    public readonly velocityX: number;
    public readonly velocityY: number;

    public constructor(uuid: UUID, velocityX: number, velocityY: number) {
        this.uuid = uuid;
        this.velocityX = velocityX;
        this.velocityY = velocityY;
    }

    public getId(): PayloadId<PlayerMoveC2SPacket> {
        return PlayerMoveC2SPacket.ID;
    }
}