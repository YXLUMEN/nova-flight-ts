import type {Payload} from "../../Payload.ts";
import {payloadType, type PayloadType} from "../../PayloadType.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientPlayHandler} from "../../../client/network/handler/ClientPlayHandler.ts";

export class ScreenShakeS2CPacket implements Payload {
    public static readonly ID: PayloadType<ScreenShakeS2CPacket> = payloadType('screen_shake');
    public static readonly CODEC: PacketCodec<ScreenShakeS2CPacket> = PacketCodecs.adapt2(
        PacketCodecs.FLOAT,
        val => val.amount,
        PacketCodecs.FLOAT,
        val => val.limit,
        ScreenShakeS2CPacket.create,
    );

    public readonly amount: number;
    public readonly limit: number;

    public constructor(amount: number, limit: number) {
        this.amount = amount;
        this.limit = limit;
    }

    public static create(amount: number, limit: number) {
        return new ScreenShakeS2CPacket(amount, limit);
    }

    public type(): PayloadType<ScreenShakeS2CPacket> {
        return ScreenShakeS2CPacket.ID;
    }

    public accept(listener: ClientPlayHandler): void {
        listener.onScreenShake(this);
    }
}