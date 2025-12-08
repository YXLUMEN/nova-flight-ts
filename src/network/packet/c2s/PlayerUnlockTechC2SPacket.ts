import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Tech} from "../../../tech/Tech.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";

export class PlayerUnlockTechC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerUnlockTechC2SPacket> = {id: Identifier.ofVanilla('player_unlock_tech')};
    public static readonly CODEC: PacketCodec<PlayerUnlockTechC2SPacket> = PacketCodecs.adapt(
        Tech.PACKET_CODEC,
        val => val.tech,
        to => new PlayerUnlockTechC2SPacket(to)
    );

    public readonly tech: RegistryEntry<Tech>;

    public constructor(tech: RegistryEntry<Tech>) {
        this.tech = tech;
    }

    public getId(): PayloadId<PlayerUnlockTechC2SPacket> {
        return PlayerUnlockTechC2SPacket.ID;
    }
}