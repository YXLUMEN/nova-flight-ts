import {PayloadTypeRegistry} from "../../network/PayloadTypeRegistry.ts";
import {SoundEventS2CPacket} from "../../network/packet/s2c/SoundEventS2CPacket.ts";
import {StopSoundS2CPacket} from "../../network/packet/s2c/StopSoundS2CPacket.ts";
import {EntitySpawnS2CPacket} from "../../network/packet/s2c/EntitySpawnS2CPacket.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import type {Payload, PayloadId} from "../../network/Payload.ts";
import {EntityHealthS2CPacket} from "../../network/packet/s2c/EntityHealthS2CPacket.ts";
import {EntityRemoveS2CPacket} from "../../network/packet/s2c/EntityRemoveS2CPacket.ts";
import {EntityPositionS2CPacket} from "../../network/packet/s2c/EntityPositionS2CPacket.ts";
import {ExplosionS2CPacket} from "../../network/packet/s2c/ExplosionS2CPacket.ts";
import {MobAiS2CPacket} from "../../network/packet/s2c/MobAiS2CPacket.ts";
import {EntityVelocityUpdateS2CPacket} from "../../network/packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../../network/packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {MoveRelative, Rotate, RotateAndMoveRelative} from "../../network/packet/s2c/EntityS2CPacket.ts";
import {ServerReadyS2CPacket} from "../../network/packet/s2c/ServerReadyS2CPacket.ts";
import {EntityKilledS2CPacket} from "../../network/packet/s2c/EntityKilledS2CPacket.ts";
import {EntityDamageS2CPacket} from "../../network/packet/s2c/EntityDamageS2CPacket.ts";
import {ParticleS2CPacket} from "../../network/packet/s2c/ParticleS2CPacket.ts";
import type {PacketCodec} from "../../network/codec/PacketCodec.ts";
import {EntityAttributesS2CPacket} from "../../network/packet/s2c/EntityAttributesS2CPacket.ts";
import {MissileSetS2CPacket} from "../../network/packet/s2c/MissileSetS2CPacket.ts";
import {EntityPositionForceS2CPacket} from "../../network/packet/s2c/EntityPositionForceS2CPacket.ts";
import {MissileLockS2CPacket} from "../../network/packet/s2c/MissileLockS2CPacket.ts";
import {ServerShutdownS2CPacket} from "../../network/packet/s2c/ServerShutdownS2CPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../../network/packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityNbtS2CPacket} from "../../network/packet/s2c/EntityNbtS2CPacket.ts";
import {InventoryS2CPacket} from "../../network/packet/s2c/InventoryS2CPacket.ts";
import {EffectCreateS2CPacket} from "../../network/packet/s2c/EffectCreateS2CPacket.ts";
import {PlayerSetScoreS2CPacket} from "../../network/packet/s2c/PlayerSetScoreS2CPacket.ts";
import {PlayerAddScoreS2CPacket} from "../../network/packet/s2c/PlayerAddScoreS2CPacket.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {EntityChooseTargetS2CPacket} from "../../network/packet/s2c/EntityChooseTargetS2CPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import {PlayerGameModeS2CPacket} from "../../network/packet/s2c/PlayerGameModeS2CPacket.ts";
import {EntityStatusEffectS2CPacket} from "../../network/packet/s2c/EntityStatusEffectS2CPacket.ts";
import {RemoveEntityStatusEffectS2CPacket} from "../../network/packet/s2c/RemoveEntityStatusEffectS2CPacket.ts";
import {ItemCooldownUpdateS2CPacket} from "../../network/packet/s2c/ItemCooldownUpdateS2CPacket.ts";
import {PlayAudioS2CPacket} from "../../network/packet/s2c/PlayAudioS2CPacket.ts";
import {GameOverS2CPacket} from "../../network/packet/s2c/GameOverS2CPacket.ts";
import {AudioControlS2CPacket} from "../../network/packet/s2c/AudioControlS2CPacket.ts";

export class ServerNetwork {
    /**
     * 先于 Client 注册
     * */
    public static registerNetworkPacket() {
        this.register(ServerReadyS2CPacket.ID, ServerReadyS2CPacket.CODEC);
        this.register(SoundEventS2CPacket.ID, SoundEventS2CPacket.CODEC);
        this.register(StopSoundS2CPacket.ID, StopSoundS2CPacket.CODEC);
        this.register(EntitySpawnS2CPacket.ID, EntitySpawnS2CPacket.CODEC);
        this.register(JoinGameS2CPacket.ID, JoinGameS2CPacket.CODEC);
        this.register(EntityHealthS2CPacket.ID, EntityHealthS2CPacket.CODEC);
        this.register(EntityRemoveS2CPacket.ID, EntityRemoveS2CPacket.CODEC);
        this.register(EntityPositionS2CPacket.ID, EntityPositionS2CPacket.CODEC);
        this.register(ExplosionS2CPacket.ID, ExplosionS2CPacket.CODEC);
        this.register(MobAiS2CPacket.ID, MobAiS2CPacket.CODEC);
        this.register(EntityVelocityUpdateS2CPacket.ID, EntityVelocityUpdateS2CPacket.CODEC);
        this.register(EntityTrackerUpdateS2CPacket.ID, EntityTrackerUpdateS2CPacket.CODEC);
        this.register(Rotate.ID, Rotate.CODEC);
        this.register(MoveRelative.ID, MoveRelative.CODEC);
        this.register(RotateAndMoveRelative.ID, RotateAndMoveRelative.CODEC);
        this.register(EntityKilledS2CPacket.ID, EntityKilledS2CPacket.CODEC);
        this.register(EntityDamageS2CPacket.ID, EntityDamageS2CPacket.CODEC);
        this.register(ParticleS2CPacket.ID, ParticleS2CPacket.CODEC);
        this.register(EntityAttributesS2CPacket.ID, EntityAttributesS2CPacket.CODEC);
        this.register(MissileSetS2CPacket.ID, MissileSetS2CPacket.CODEC);
        this.register(EntityPositionForceS2CPacket.ID, EntityPositionForceS2CPacket.CODEC);
        this.register(MissileLockS2CPacket.ID, MissileLockS2CPacket.CODEC);
        this.register(ServerShutdownS2CPacket.ID, ServerShutdownS2CPacket.CODEC);
        this.register(EntityBatchSpawnS2CPacket.ID, EntityBatchSpawnS2CPacket.CODEC);
        this.register(EntityNbtS2CPacket.ID, EntityNbtS2CPacket.CODEC);
        this.register(InventoryS2CPacket.ID, InventoryS2CPacket.CODEC);
        this.register(EffectCreateS2CPacket.ID, EffectCreateS2CPacket.CODEC);
        this.register(PlayerSetScoreS2CPacket.ID, PlayerSetScoreS2CPacket.CODEC);
        this.register(PlayerAddScoreS2CPacket.ID, PlayerAddScoreS2CPacket.CODEC);
        this.register(PlayerDisconnectS2CPacket.ID, PlayerDisconnectS2CPacket.CODEC);
        this.register(EntityChooseTargetS2CPacket.ID, EntityChooseTargetS2CPacket.CODEC);
        this.register(GameMessageS2CPacket.ID, GameMessageS2CPacket.CODEC);
        this.register(PlayerGameModeS2CPacket.ID, PlayerGameModeS2CPacket.CODEC);
        this.register(EntityStatusEffectS2CPacket.ID, EntityStatusEffectS2CPacket.CODEC);
        this.register(RemoveEntityStatusEffectS2CPacket.ID, RemoveEntityStatusEffectS2CPacket.CODEC);
        this.register(ItemCooldownUpdateS2CPacket.ID, ItemCooldownUpdateS2CPacket.CODEC);
        this.register(PlayAudioS2CPacket.ID, PlayAudioS2CPacket.CODEC);
        this.register(GameOverS2CPacket.ID, GameOverS2CPacket.CODEC);
        this.register(AudioControlS2CPacket.ID, AudioControlS2CPacket.CODEC);
        PayloadTypeRegistry.playS2C().settle();
    }

    private static register<T extends Payload>(payloadId: PayloadId<T>, codec: PacketCodec<T>): void {
        PayloadTypeRegistry.playS2C().register(payloadId, codec);
    }
}