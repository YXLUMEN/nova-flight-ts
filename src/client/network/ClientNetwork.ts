import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerLoginC2SPayload} from "../../network/packet/c2s/PlayerLoginC2SPayload.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";

export class ClientNetwork {
    public static registerNetworkPacket(): void {
        this.register(StringPacket.ID, StringPacket.CODEC);
        this.register(PlayerAimC2SPacket.ID, PlayerAimC2SPacket.CODEC);
        this.register(PlayerMoveC2SPacket.ID, PlayerMoveC2SPacket.CODEC);
        this.register(PlayerInputC2SPacket.ID, PlayerInputC2SPacket.CODEC);
        this.register(PlayerLoginC2SPayload.ID, PlayerLoginC2SPayload.CODEC);
        this.register(PlayerFireC2SPacket.ID, PlayerFireC2SPacket.CODEC);
        this.register(PlayerUnlockTechC2SPacket.ID, PlayerUnlockTechC2SPacket.CODEC);
        this.register(PlayerSwitchSlotC2SPacket.ID, PlayerSwitchSlotC2SPacket.CODEC);
    }

    private static register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        PayloadTypeRegistry.playC2S().register(payloadId, codec)
    }
}