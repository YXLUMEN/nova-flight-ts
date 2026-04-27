import {type Payload, payloadId, type PayloadId} from "../../Payload.ts";
import type {PacketCodec} from "../../codec/PacketCodec.ts";
import {PacketCodecs} from "../../codec/PacketCodecs.ts";
import type {ClientNetworkHandler} from "../../../client/network/ClientNetworkHandler.ts";

export class ScreenShakeS2CPacket implements Payload {
    public static readonly ID: PayloadId<ScreenShakeS2CPacket> = payloadId('screen_shake');
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

    public getId(): PayloadId<ScreenShakeS2CPacket> {
        return ScreenShakeS2CPacket.ID;
    }

    public accept(listener: ClientNetworkHandler): void {
        listener.onScreenShake(this);
    }
}