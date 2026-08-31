import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ServerPlayHandler} from "../../../server/network/handler/ServerPlayHandler.ts";

export class AcceptTeleportC2SPacket implements Payload {
    public static readonly ID: PayloadType<AcceptTeleportC2SPacket> = payloadType('player_position');
    public static readonly CODEC: PacketCodec<AcceptTeleportC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.VAR_UINT,
        val => val.id,
        val => new AcceptTeleportC2SPacket(val)
    );

    public readonly id: number;

    public constructor(id: number) {
        this.id = id;
    }

    public type(): PayloadType<any> {
        return AcceptTeleportC2SPacket.ID;
    }

    public accept(listener: ServerPlayHandler): void {
        listener.onAcceptTeleport(this);
    }
}