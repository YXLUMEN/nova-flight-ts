import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {UUID} from "../../../type/types.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class PlayerDisconnectS2CPacket implements Payload {
    public static readonly ID: PayloadType<PlayerDisconnectS2CPacket> = payloadType('player_disconnect');
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

    public type(): PayloadType<PlayerDisconnectS2CPacket> {
        return PlayerDisconnectS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onPlayerDisconnect(this);
    }
}