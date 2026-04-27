import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {RegistryEntry} from "../../../registry/tag/RegistryEntry.ts";
import {Tech} from "../../../world/tech/Tech.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class PlayerResetTechC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerResetTechC2SPacket> = payloadId('player_reset_tech');
    public static readonly CODEC: PacketCodec<PlayerResetTechC2SPacket> = PacketCodecs.adapt(
        Tech.PACKET_CODEC,
        val => val.entry,
        val => new PlayerResetTechC2SPacket(val)
    );

    public readonly entry: RegistryEntry<Tech>;

    public constructor(entry: RegistryEntry<Tech>) {
        this.entry = entry;
    }

    public getId(): PayloadId<PlayerResetTechC2SPacket> {
        return PlayerResetTechC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onTechRest(this);
    }
}