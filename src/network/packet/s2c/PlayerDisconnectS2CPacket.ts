import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class PlayerDisconnectS2CPacket implements Payload {
    public static readonly ID: PayloadId<PlayerDisconnectS2CPacket> = payloadId('player_disconnect');
    public static readonly CODEC: PacketCodec<PlayerDisconnectS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.UUID,
        val => val.uuid,
        PacketCodecs.STRING,
        val => val.reason.getKey(),
        PlayerDisconnectS2CPacket.new
    );

    public readonly uuid: UUID;
    public readonly reason: TranslatableText;

    public constructor(uuid: UUID, reason: TranslatableText) {
        this.uuid = uuid;
        this.reason = reason;
    }

    public static new(uuid: UUID, reason: string) {
        return new PlayerDisconnectS2CPacket(uuid, TranslatableText.of(reason));
    }

    public getId(): PayloadId<PlayerDisconnectS2CPacket> {
        return PlayerDisconnectS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onPlayerDisconnect(this);
    }
}