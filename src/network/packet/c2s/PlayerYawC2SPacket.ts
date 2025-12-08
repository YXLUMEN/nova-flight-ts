import type {Payload, PayloadId} from "../../Payload.ts";
import {Identifier} from "../../../registry/Identifier.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {decodeYaw, encodeYaw} from "../../../utils/NetUtil.ts";

export class PlayerYawC2SPacket implements Payload {
    public static readonly ID: PayloadId<PlayerYawC2SPacket> = {id: Identifier.ofVanilla('player_yaw')};
    public static readonly CODEC: PacketCodec<PlayerYawC2SPacket> = PacketCodecs.adapt(
        PacketCodecs.INT8,
        val => val.yawInt8,
        to => new PlayerYawC2SPacket(to)
    );

    private readonly yawInt8: number;

    public constructor(yawInt8: number) {
        this.yawInt8 = yawInt8;
    }

    public static create(yaw: number) {
        return new PlayerYawC2SPacket(encodeYaw(yaw));
    }

    public getId(): PayloadId<PlayerYawC2SPacket> {
        return PlayerYawC2SPacket.ID;
    }

    public get yaw() {
        return decodeYaw(this.yawInt8);
    }
}