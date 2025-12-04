import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";

export class PlayerUnlockTechC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerUnlockTechC2SPacket> = {id: Identifier.ofVanilla('player_unlock_tech')};

    public static readonly CODEC: PacketCodec<PlayerUnlockTechC2SPacket> = PacketCodecs.of<PlayerUnlockTechC2SPacket>(
        (writer, value) => {
            writer.writeString(value.techName);
        },
        (reader) => {
            return new PlayerUnlockTechC2SPacket(reader.readString());
        }
    );

    public readonly techName: string;

    public constructor(tech: string) {
        this.techName = tech;
    }

    public getId(): PayloadId<PlayerUnlockTechC2SPacket> {
        return PlayerUnlockTechC2SPacket.ID;
    }
}