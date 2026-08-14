import {CodecRegistry} from "../../network/CodecRegistry.ts";
import {FullMove, PositionOnly, Steering} from "../../network/packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerInputC2SPacket} from "../../network/packet/c2s/PlayerInputC2SPacket.ts";
import type {Payload} from "../../network/Payload.ts";
import type {PayloadType} from "../../network/PayloadType.ts";
import {PlayerFireC2SPacket} from "../../network/packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../../network/packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../../network/packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {PlayerFinishLoginC2SPacket} from "../../network/packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerResetAllTechC2SPacket} from "../../network/packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {CommandExecutionC2SPacket} from "../../network/packet/c2s/CommandExecutionC2SPacket.ts";
import {ChatMessageC2SPacket} from "../../network/packet/c2s/ChatMessageC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../../network/packet/c2s/PlayerReloadC2SPacket.ts";
import {PlayerResetTechC2SPacket} from "../../network/packet/c2s/PlayerResetTechC2SPacket.ts";
import {PingC2SPacket} from "../../network/packet/c2s/PingC2SPacket.ts";
import {BlockChangeC2SPacket} from "../../network/packet/c2s/BlockChangeC2SPacket.ts";
import {BatchBlockChangesPacket} from "../../network/packet/common/BatchBlockChangesPacket.ts";
import {FireSpecialC2SPacket} from "../../network/packet/c2s/FireSpecialC2SPacket.ts";
import {PlayerInventorySwapC2SPacket} from "../../network/packet/c2s/PlayerInventorySwapC2SPacket.ts";
import {RequestTeleportC2SPacket} from "../../network/packet/c2s/RequestTeleportC2SPacket.ts";
import {BatchBufferPacket} from "../../network/packet/common/BatchBufferPacket.ts";
import {ClientHandshakeC2SPacket} from "../../network/packet/handshake/ClientHandshakeC2SPacket.ts";
import {ClientProfileC2SPacket} from "../../network/packet/handshake/ClientProfileC2SPacket.ts";
import {ClientStartConfigC2SPacket} from "../../network/packet/handshake/ClientStartConfigC2SPacket.ts";

export class ClientPackets {
    public static registerNetworkPacket(): void {
        this.register(PingC2SPacket.ID, PingC2SPacket.CODEC);
        this.register(ClientHandshakeC2SPacket.ID, ClientHandshakeC2SPacket.CODEC);
        this.register(ClientProfileC2SPacket.ID, ClientProfileC2SPacket.CODEC);
        this.register(ClientStartConfigC2SPacket.ID, ClientStartConfigC2SPacket.CODEC);
        this.register(PlayerFinishLoginC2SPacket.ID, PlayerFinishLoginC2SPacket.CODEC);

        this.register(FullMove.ID, FullMove.CODEC);
        this.register(PositionOnly.ID, PositionOnly.CODEC);
        this.register(Steering.ID, Steering.CODEC);
        this.register(PlayerInputC2SPacket.ID, PlayerInputC2SPacket.CODEC);
        this.register(PlayerFireC2SPacket.ID, PlayerFireC2SPacket.CODEC);
        this.register(PlayerUnlockTechC2SPacket.ID, PlayerUnlockTechC2SPacket.CODEC);
        this.register(PlayerSwitchSlotC2SPacket.ID, PlayerSwitchSlotC2SPacket.CODEC);
        this.register(PlayerResetAllTechC2SPacket.ID, PlayerResetAllTechC2SPacket.CODEC);
        this.register(CommandExecutionC2SPacket.ID, CommandExecutionC2SPacket.CODEC);
        this.register(ChatMessageC2SPacket.ID, ChatMessageC2SPacket.CODEC);
        this.register(PlayerReloadC2SPacket.ID, PlayerReloadC2SPacket.CODEC);
        this.register(PlayerResetTechC2SPacket.ID, PlayerResetTechC2SPacket.CODEC);
        this.register(BlockChangeC2SPacket.ID, BlockChangeC2SPacket.CODEC);
        this.register(BatchBlockChangesPacket.ID, BatchBlockChangesPacket.CODEC);
        this.register(FireSpecialC2SPacket.ID, FireSpecialC2SPacket.CODEC);
        this.register(PlayerInventorySwapC2SPacket.ID, PlayerInventorySwapC2SPacket.CODEC);
        this.register(RequestTeleportC2SPacket.ID, RequestTeleportC2SPacket.CODEC);
        this.register(BatchBufferPacket.ID, BatchBufferPacket.CODEC);
    }

    private static register<T extends Payload>(type: PayloadType<T>, codec: PacketCodec<T>): void {
        CodecRegistry.C2S.register(type, codec)
    }
}