import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodec} from "../../codec/PacketCodec.ts";
import type {UUID} from "../../../apis/registry.ts";

export class PlayerUnlockTechC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerUnlockTechC2SPacket> = {id: Identifier.ofVanilla('player_unlock_tech')};

    public static readonly CODEC: PacketCodec<PlayerUnlockTechC2SPacket> = PacketCodec.of<PlayerUnlockTechC2SPacket>(
        (value, writer) => {
            writer.writeUUID(value.uuid);
            writer.writeString(value.techName);
        },
        (reader) => {
            return new PlayerUnlockTechC2SPacket(reader.readUUID(), reader.readString());
        }
    );

    public readonly uuid: UUID;
    public readonly techName: string;

    public constructor(uuid: UUID, tech: string) {
        this.uuid = uuid;
        this.techName = tech;
    }

    public getId(): PayloadId<PlayerUnlockTechC2SPacket> {
        return PlayerUnlockTechC2SPacket.ID;
    }
}