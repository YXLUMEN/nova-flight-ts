import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {Vec2dPacket} from "../../network/packet/Vec2dPacket.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerLoginC2SPayload} from "../../network/packet/c2s/PlayerLoginC2SPayload.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";

export class ClientNetwork {
    public static registerNetworkPacket(): void {
        this.register(Vec2dPacket.ID, Vec2dPacket.CODEC);
        this.register(StringPacket.ID, StringPacket.CODEC);
        this.register(PlayerAimC2SPacket.ID, PlayerAimC2SPacket.CODEC);
        this.register(PlayerMoveC2SPacket.ID, PlayerMoveC2SPacket.CODEC);
        this.register(PlayerInputC2SPacket.ID, PlayerInputC2SPacket.CODEC);
        this.register(PlayerLoginC2SPayload.ID, PlayerLoginC2SPayload.CODEC);
        this.register(PlayerFireC2SPacket.ID, PlayerFireC2SPacket.CODEC);
    }

    private static register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        PayloadTypeRegistry.playC2S().register(payloadId, codec)
    }
}