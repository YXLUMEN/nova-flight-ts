import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {PlayerAimC2SPacket} from "../../network/packet/c2s/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerAttemptLoginC2SPacket} from "../../network/packet/c2s/PlayerAttemptLoginC2SPacket.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {RequestPositionC2SPacket} from "../../network/packet/c2s/RequestPositionC2SPacket.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {DebugStringPacket} from "../../network/packet/DebugStringPacket.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerTechResetC2SPacket} from "../../network/packet/c2s/PlayerTechResetC2SPacket.ts";
import {PlayerMoveByPointerC2SPacket} from "../../network/packet/c2s/PlayerMoveByPointerC2SPacket.ts";

export class ClientNetwork {
    public static registerNetworkPacket(): void {
        this.register(PlayerAimC2SPacket.ID, PlayerAimC2SPacket.CODEC);
        this.register(PlayerMoveC2SPacket.ID, PlayerMoveC2SPacket.CODEC);
        this.register(PlayerMoveByPointerC2SPacket.ID, PlayerMoveByPointerC2SPacket.CODEC);
        this.register(PlayerInputC2SPacket.ID, PlayerInputC2SPacket.CODEC);
        this.register(PlayerAttemptLoginC2SPacket.ID, PlayerAttemptLoginC2SPacket.CODEC);
        this.register(PlayerFireC2SPacket.ID, PlayerFireC2SPacket.CODEC);
        this.register(PlayerUnlockTechC2SPacket.ID, PlayerUnlockTechC2SPacket.CODEC);
        this.register(PlayerSwitchSlotC2SPacket.ID, PlayerSwitchSlotC2SPacket.CODEC);
        this.register(RequestPositionC2SPacket.ID, RequestPositionC2SPacket.CODEC);
        this.register(DebugStringPacket.ID, DebugStringPacket.CODEC);
        this.register(PlayerFinishLoginC2SPacket.ID, PlayerFinishLoginC2SPacket.CODEC);
        this.register(PlayerTechResetC2SPacket.ID, PlayerTechResetC2SPacket.CODEC);
    }

    private static register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        PayloadTypeRegistry.playC2S().register(payloadId, codec)
    }
}