import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {StringPacket} from "../../network/packet/StringPacket.ts";
import {SoundEventS2CPacket} from "../../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../../network/packet/s2c/StopSoundS2CPacket.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {EntityHealthS2CPacket} from "../../network/packet/s2c/EntityHealthS2CPacket.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";

export class ServerNetwork {
    public static registerNetworkPacket() {
        this.register(StringPacket.ID, StringPacket.CODEC);
        this.register(SoundEventS2CPacket.ID, SoundEventS2CPacket.CODEC);
        this.register(StopSoundS2CPacket.ID, StopSoundS2CPacket.CODEC);
        this.register(EntitySpawnS2CPacket.ID, EntitySpawnS2CPacket.CODEC);
        this.register(JoinGameS2CPacket.ID, JoinGameS2CPacket.CODEC);
        this.register(EntityHealthS2CPacket.ID, EntityHealthS2CPacket.CODEC);
        this.register(EntityRemoveS2CPacket.ID, EntityRemoveS2CPacket.CODEC);
        this.register(EntityPositionS2CPacket.ID, EntityPositionS2CPacket.CODEC);
        this.register(ExplosionS2CPacket.ID, ExplosionS2CPacket.CODEC);
        this.register(MobAiS2CPacket.ID, MobAiS2CPacket.CODEC);
    }

    private static register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        PayloadTypeRegistry.playS2C().register(payloadId, codec);
    }
}