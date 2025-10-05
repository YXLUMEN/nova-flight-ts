import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {Vec2dPacket} from "../../network/packet/Vec2dPacket.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {SoundEventS2CPacket} from "../../network/packet/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../../network/packet/StopSoundS2CPacket.ts";

export class ServerNetwork {
    public static registerNetwork() {
        PayloadTypeRegistry.playS2C().register(Vec2dPacket.ID, Vec2dPacket.CODEC);
        PayloadTypeRegistry.playS2C().register(StringPacket.ID, StringPacket.CODEC);
        PayloadTypeRegistry.playS2C().register(SoundEventS2CPacket.ID, SoundEventS2CPacket.CODEC);
        PayloadTypeRegistry.playS2C().register(StopSoundS2CPacket.ID, StopSoundS2CPacket.CODEC);
    }
}