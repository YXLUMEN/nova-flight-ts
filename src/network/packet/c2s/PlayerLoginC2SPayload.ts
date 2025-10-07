import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerLoginC2SPayload implements Payload {
    public static readonly ID: PayloadId<PlayerLoginC2SPayload> = {id: Identifier.ofVanilla('player_login')};

    public static readonly CODEC: PacketCodec<PlayerLoginC2SPayload> = PacketCodec.of<PlayerLoginC2SPayload>(
        (value, writer) => {
            writer.writeUUID(value.uuid);
        },
        (reader) => {
            return new PlayerLoginC2SPayload(reader.readUUID());
        }
    );

    public readonly uuid: UUID;

    public constructor(uuid: UUID) {
        this.uuid = uuid;
    }

    public getId(): PayloadId<PlayerLoginC2SPayload> {
        return PlayerLoginC2SPayload.ID;
    }
}