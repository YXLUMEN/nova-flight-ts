import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {Vec2dPacket} from "../../network/packet/Vec2dPacket.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {PlayerAimC2SPacket} from "../../network/packet/PlayerAimC2SPacket.ts";
import {PlayerMoveC2SPacket} from "../../network/packet/PlayerMoveC2SPacket.ts";

export class ClientNetwork {
    public static registerNetwork(): void {
        PayloadTypeRegistry.playC2S().register(Vec2dPacket.ID, Vec2dPacket.CODEC);
        PayloadTypeRegistry.playC2S().register(StringPacket.ID, StringPacket.CODEC);
        PayloadTypeRegistry.playC2S().register(PlayerAimC2SPacket.ID, PlayerAimC2SPacket.CODEC);
        PayloadTypeRegistry.playC2S().register(PlayerMoveC2SPacket.ID, PlayerMoveC2SPacket.CODEC);
    }
}