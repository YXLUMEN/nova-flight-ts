import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import {Tech} from "../../../world/tech/Tech.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerUnlockTechC2SPacket implements Payload {
    public static readonly ID: PayloadType<PlayerUnlockTechC2SPacket> = payloadType('player_unlock_tech');
    public static readonly CODEC: PacketCodec<PlayerUnlockTechC2SPacket> = PacketCodecs.adapt(
        Tech.PACKET_CODEC,
        val => val.tech,
        to => new PlayerUnlockTechC2SPacket(to)
    );

    public readonly tech: RegistryEntry<Tech>;

    public constructor(tech: RegistryEntry<Tech>) {
        this.tech = tech;
    }

    public type(): PayloadType<PlayerUnlockTechC2SPacket> {
        return PlayerUnlockTechC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onUnlockTech(this);
    }
}