import {ProtocolInfoBuilder} from "./ProtocolInfoBuilder.ts";
import {ConnectionState} from "../../server/network/ConnectionState.ts";
import {PongS2CPacket} from "../packet/s2c/PongS2CPacket.ts";
import {BatchBlockChangesPacket} from "../packet/common/BatchBlockChangesPacket.ts";
import {BatchBufferPacket} from "../packet/common/BatchBufferPacket.ts";
import {PositionMoveRotation} from "../packet/common/PositionMoveRotation.ts";
import {AudioControlS2CPacket, AudioLeapS2CPacket} from "../packet/s2c/AudioControlS2CPacket.ts";
import {AudioStopS2CPacket} from "../packet/s2c/AudioStopS2CPacket.ts";
import {BlockChangeS2CPacket} from "../packet/s2c/BlockChangeS2CPacket.ts";
import {ContainerSetSlotS2CPacket} from "../packet/s2c/ContainerSetSlotS2CPacket.ts";
import {DifficultChangeS2CPacket} from "../packet/s2c/DifficultChangeS2CPacket.ts";
import {EffectCreateS2CPacket} from "../packet/s2c/EffectCreateS2CPacket.ts";
import {EntitiesRemoveS2CPacket} from "../packet/s2c/EntitiesRemoveS2CPacket.ts";
import {EntityAttributesS2CPacket} from "../packet/s2c/EntityAttributesS2CPacket.ts";
import {EntityBatchSpawnS2CPacket} from "../packet/s2c/EntityBatchSpawnS2CPacket.ts";
import {EntityDamageS2CPacket} from "../packet/s2c/EntityDamageS2CPacket.ts";
import {EntityHealthS2CPacket} from "../packet/s2c/EntityHealthS2CPacket.ts";
import {EntityKilledS2CPacket} from "../packet/s2c/EntityKilledS2CPacket.ts";
import {MoveRelative, Rotate, RotateAndMoveRelative} from "../packet/s2c/EntityMoveS2CPacket.ts";
import {EntityMovementS2CPacket} from "../packet/s2c/EntityMovementS2CPacket.ts";
import {EntityNbtS2CPacket} from "../packet/s2c/EntityNbtS2CPacket.ts";
import {EntityPositionForceS2CPacket} from "../packet/s2c/EntityPositionForceS2CPacket.ts";
import {EntityPositionS2CPacket} from "../packet/s2c/EntityPositionS2CPacket.ts";
import {EntityRemoveS2CPacket} from "../packet/s2c/EntityRemoveS2CPacket.ts";
import {EntitySpawnS2CPacket} from "../packet/s2c/EntitySpawnS2CPacket.ts";
import {EntityStatusEffectS2CPacket} from "../packet/s2c/EntityStatusEffectS2CPacket.ts";
import {EntityTrackerUpdateS2CPacket} from "../packet/s2c/EntityTrackerUpdateS2CPacket.ts";
import {EntityVelocityUpdateS2CPacket} from "../packet/s2c/EntityVelocityUpdateS2CPacket.ts";
import {ExplosionS2CPacket} from "../packet/s2c/ExplosionS2CPacket.ts";
import {GameMessageS2CPacket} from "../packet/s2c/GameMessageS2CPacket.ts";
import {GameOverS2CPacket} from "../packet/s2c/GameOverS2CPacket.ts";
import {InventoryS2CPacket} from "../packet/s2c/InventoryS2CPacket.ts";
import {ItemCooldownUpdateS2CPacket} from "../packet/s2c/ItemCooldownUpdateS2CPacket.ts";
import {JoinGameS2CPacket} from "../packet/s2c/JoinGameS2CPacket.ts";
import {KeepAliveS2CPacket} from "../packet/s2c/KeepAliveS2CPacket.ts";
import {LaserWeaponActivate, LaserWeaponChange, LaserWeaponDeactivate} from "../packet/s2c/LaserWeaponS2CPacket.ts";
import {NotGiveUpS2CPacket} from "../packet/s2c/NotGiveUpS2CPacket.ts";
import {EntityEmitter, PosEmitter} from "../packet/s2c/ParticleEmitterS2CPacket.ts";
import {ParticleS2CPacket} from "../packet/s2c/ParticleS2CPacket.ts";
import {PlayAudioS2CPacket} from "../packet/s2c/PlayAudioS2CPacket.ts";
import {PlayerAddScoreS2CPacket} from "../packet/s2c/PlayerAddScoreS2CPacket.ts";
import {PlayerDisconnectS2CPacket} from "../packet/s2c/PlayerDisconnectS2CPacket.ts";
import {PlayerJoinS2CPacket} from "../packet/s2c/PlayerJoinS2CPacket.ts";
import {PlayerPositionS2CPacket} from "../packet/s2c/PlayerPositionS2CPacket.ts";
import {PlayerProfileSyncS2CPacket} from "../packet/s2c/PlayerProfileSyncS2CPacket.ts";
import {PlayerProfilesS2CPacket} from "../packet/s2c/PlayerProfilesS2CPacket.ts";
import {PlayerRespawnS2CPacket} from "../packet/s2c/PlayerRespawnS2CPacket.ts";
import {PlayerSetScoreS2CPacket} from "../packet/s2c/PlayerSetScoreS2CPacket.ts";
import {PreparedParticleS2CPacket} from "../packet/s2c/PreparedParticleS2CPacket.ts";
import {RemoveEntityStatusEffectS2CPacket} from "../packet/s2c/RemoveEntityStatusEffectS2CPacket.ts";
import {ScreenShakeS2CPacket} from "../packet/s2c/ScreenShakeS2CPacket.ts";
import {ServerShutdownS2CPacket} from "../packet/s2c/ServerShutdownS2CPacket.ts";
import {SetPlayerInventoryS2CPacket} from "../packet/s2c/SetPlayerInventoryPacket.ts";
import {SoundEventS2CPacket} from "../packet/s2c/SoundEventS2CPacket.ts";
import {SpawnWorldEventS2CPacket} from "../packet/s2c/SpawnWorldEventS2CPacket.ts";
import {StageChangeS2CPacket} from "../packet/s2c/StageChangeS2CPacket.ts";
import {StopSoundS2CPacket} from "../packet/s2c/StopSoundS2CPacket.ts";
import {TickChangeS2CPacket} from "../packet/s2c/TickChangeS2CPacket.ts";
import {TranslatableTextS2CPacket} from "../packet/s2c/TranslatableTextS2CPacket.ts";
import {PingC2SPacket} from "../packet/c2s/PingC2SPacket.ts";
import {AcceptTeleportC2SPacket} from "../packet/c2s/AcceptTeleportC2SPacket.ts";
import {BlockChangeC2SPacket} from "../packet/c2s/BlockChangeC2SPacket.ts";
import {ChatMessageC2SPacket} from "../packet/c2s/ChatMessageC2SPacket.ts";
import {CommandExecutionC2SPacket} from "../packet/c2s/CommandExecutionC2SPacket.ts";
import {FireSpecialC2SPacket} from "../packet/c2s/FireSpecialC2SPacket.ts";
import {KeepAliveC2SPacket} from "../packet/c2s/KeepAliveC2SPacket.ts";
import {PlayerFinishLoginC2SPacket} from "../packet/c2s/PlayerFinishLoginC2SPacket.ts";
import {PlayerFireC2SPacket} from "../packet/c2s/PlayerFireC2SPacket.ts";
import {PlayerInputC2SPacket} from "../packet/c2s/PlayerInputC2SPacket.ts";
import {PlayerInventorySwapC2SPacket} from "../packet/c2s/PlayerInventorySwapC2SPacket.ts";
import {FullMove, PositionOnly, Steering} from "../packet/c2s/PlayerMoveC2SPacket.ts";
import {PlayerReloadC2SPacket} from "../packet/c2s/PlayerReloadC2SPacket.ts";
import {PlayerResetAllTechC2SPacket} from "../packet/c2s/PlayerResetAllTechC2SPacket.ts";
import {PlayerResetTechC2SPacket} from "../packet/c2s/PlayerResetTechC2SPacket.ts";
import {PlayerSwitchSlotC2SPacket} from "../packet/c2s/PlayerSwitchSlotC2SPacket.ts";
import {PlayerUnlockTechC2SPacket} from "../packet/c2s/PlayerUnlockTechC2SPacket.ts";
import {RequestTeleportC2SPacket} from "../packet/c2s/RequestTeleportC2SPacket.ts";

export class PlayProtocol {
    public static readonly SERVER_BOUND = ProtocolInfoBuilder.serverBound(
        ConnectionState.PLAY,
        builder => builder
            .add(PongS2CPacket.ID, PongS2CPacket.CODEC)
            .add(BatchBlockChangesPacket.ID, BatchBlockChangesPacket.CODEC)
            .add(BatchBufferPacket.ID, BatchBufferPacket.CODEC)
            .add(PositionMoveRotation.ID, PositionMoveRotation.CODEC)
            .add(AudioControlS2CPacket.ID, AudioControlS2CPacket.CODEC)
            .add(AudioStopS2CPacket.ID, AudioStopS2CPacket.CODEC)
            .add(BlockChangeS2CPacket.ID, BlockChangeS2CPacket.CODEC)
            .add(ContainerSetSlotS2CPacket.ID, ContainerSetSlotS2CPacket.CODEC)
            .add(DifficultChangeS2CPacket.ID, DifficultChangeS2CPacket.CODEC)
            .add(EffectCreateS2CPacket.ID, EffectCreateS2CPacket.CODEC)
            .add(AudioLeapS2CPacket.ID, AudioLeapS2CPacket.CODEC)
            .add(EntitiesRemoveS2CPacket.ID, EntitiesRemoveS2CPacket.CODEC)
            .add(EntityAttributesS2CPacket.ID, EntityAttributesS2CPacket.CODEC)
            .add(EntityBatchSpawnS2CPacket.ID, EntityBatchSpawnS2CPacket.CODEC)
            .add(EntityDamageS2CPacket.ID, EntityDamageS2CPacket.CODEC)
            .add(EntityHealthS2CPacket.ID, EntityHealthS2CPacket.CODEC)
            .add(EntityKilledS2CPacket.ID, EntityKilledS2CPacket.CODEC)
            .add(MoveRelative.ID, MoveRelative.CODEC)
            .add(Rotate.ID, Rotate.CODEC)
            .add(RotateAndMoveRelative.ID, RotateAndMoveRelative.CODEC)
            .add(EntityMovementS2CPacket.ID, EntityMovementS2CPacket.CODEC)
            .add(EntityNbtS2CPacket.ID, EntityNbtS2CPacket.CODEC)
            .add(EntityPositionForceS2CPacket.ID, EntityPositionForceS2CPacket.CODEC)
            .add(EntityPositionS2CPacket.ID, EntityPositionS2CPacket.CODEC)
            .add(EntityRemoveS2CPacket.ID, EntityRemoveS2CPacket.CODEC)
            .add(EntitySpawnS2CPacket.ID, EntitySpawnS2CPacket.CODEC)
            .add(EntityStatusEffectS2CPacket.ID, EntityStatusEffectS2CPacket.CODEC)
            .add(EntityTrackerUpdateS2CPacket.ID, EntityTrackerUpdateS2CPacket.CODEC)
            .add(EntityVelocityUpdateS2CPacket.ID, EntityVelocityUpdateS2CPacket.CODEC)
            .add(ExplosionS2CPacket.ID, ExplosionS2CPacket.CODEC)
            .add(GameMessageS2CPacket.ID, GameMessageS2CPacket.CODEC)
            .add(GameOverS2CPacket.ID, GameOverS2CPacket.CODEC)
            .add(InventoryS2CPacket.ID, InventoryS2CPacket.CODEC)
            .add(ItemCooldownUpdateS2CPacket.ID, ItemCooldownUpdateS2CPacket.CODEC)
            .add(JoinGameS2CPacket.ID, JoinGameS2CPacket.CODEC)
            .add(KeepAliveS2CPacket.ID, KeepAliveS2CPacket.CODEC)
            .add(LaserWeaponActivate.ID, LaserWeaponActivate.CODEC)
            .add(LaserWeaponChange.ID, LaserWeaponChange.CODEC)
            .add(LaserWeaponDeactivate.ID, LaserWeaponDeactivate.CODEC)
            .add(NotGiveUpS2CPacket.ID, NotGiveUpS2CPacket.CODEC)
            .add(EntityEmitter.ID, EntityEmitter.CODEC)
            .add(PosEmitter.ID, PosEmitter.CODEC)
            .add(ParticleS2CPacket.ID, ParticleS2CPacket.CODEC)
            .add(PlayAudioS2CPacket.ID, PlayAudioS2CPacket.CODEC)
            .add(PlayerAddScoreS2CPacket.ID, PlayerAddScoreS2CPacket.CODEC)
            .add(PlayerDisconnectS2CPacket.ID, PlayerDisconnectS2CPacket.CODEC)
            .add(PlayerJoinS2CPacket.ID, PlayerJoinS2CPacket.CODEC)
            .add(PlayerPositionS2CPacket.ID, PlayerPositionS2CPacket.CODEC)
            .add(PlayerProfileSyncS2CPacket.ID, PlayerProfileSyncS2CPacket.CODEC)
            .add(PlayerProfilesS2CPacket.ID, PlayerProfilesS2CPacket.CODEC)
            .add(PlayerRespawnS2CPacket.ID, PlayerRespawnS2CPacket.CODEC)
            .add(PlayerSetScoreS2CPacket.ID, PlayerSetScoreS2CPacket.CODEC)
            .add(PreparedParticleS2CPacket.ID, PreparedParticleS2CPacket.CODEC)
            .add(RemoveEntityStatusEffectS2CPacket.ID, RemoveEntityStatusEffectS2CPacket.CODEC)
            .add(ScreenShakeS2CPacket.ID, ScreenShakeS2CPacket.CODEC)
            .add(ServerShutdownS2CPacket.ID, ServerShutdownS2CPacket.CODEC)
            .add(SetPlayerInventoryS2CPacket.ID, SetPlayerInventoryS2CPacket.CODEC)
            .add(SoundEventS2CPacket.ID, SoundEventS2CPacket.CODEC)
            .add(SpawnWorldEventS2CPacket.ID, SpawnWorldEventS2CPacket.CODEC)
            .add(StageChangeS2CPacket.ID, StageChangeS2CPacket.CODEC)
            .add(StopSoundS2CPacket.ID, StopSoundS2CPacket.CODEC)
            .add(TickChangeS2CPacket.ID, TickChangeS2CPacket.CODEC)
            .add(TranslatableTextS2CPacket.ID, TranslatableTextS2CPacket.CODEC)
    );

    public static readonly CLIENT_BOUND = ProtocolInfoBuilder.clientBound(
        ConnectionState.PLAY,
        builder => builder
            .add(PingC2SPacket.ID, PingC2SPacket.CODEC)
            .add(BatchBlockChangesPacket.ID, BatchBlockChangesPacket.CODEC)
            .add(BatchBufferPacket.ID, BatchBufferPacket.CODEC)
            .add(PositionMoveRotation.ID, PositionMoveRotation.CODEC)
            .add(AcceptTeleportC2SPacket.ID, AcceptTeleportC2SPacket.CODEC)
            .add(BlockChangeC2SPacket.ID, BlockChangeC2SPacket.CODEC)
            .add(ChatMessageC2SPacket.ID, ChatMessageC2SPacket.CODEC)
            .add(CommandExecutionC2SPacket.ID, CommandExecutionC2SPacket.CODEC)
            .add(FireSpecialC2SPacket.ID, FireSpecialC2SPacket.CODEC)
            .add(KeepAliveC2SPacket.ID, KeepAliveC2SPacket.CODEC)
            .add(PlayerFinishLoginC2SPacket.ID, PlayerFinishLoginC2SPacket.CODEC)
            .add(PlayerFireC2SPacket.ID, PlayerFireC2SPacket.CODEC)
            .add(PlayerInputC2SPacket.ID, PlayerInputC2SPacket.CODEC)
            .add(PlayerInventorySwapC2SPacket.ID, PlayerInventorySwapC2SPacket.CODEC)
            .add(FullMove.ID, FullMove.CODEC)
            .add(PositionOnly.ID, PositionOnly.CODEC)
            .add(Steering.ID, Steering.CODEC)
            .add(PlayerReloadC2SPacket.ID, PlayerReloadC2SPacket.CODEC)
            .add(PlayerResetAllTechC2SPacket.ID, PlayerResetAllTechC2SPacket.CODEC)
            .add(PlayerResetTechC2SPacket.ID, PlayerResetTechC2SPacket.CODEC)
            .add(PlayerSwitchSlotC2SPacket.ID, PlayerSwitchSlotC2SPacket.CODEC)
            .add(PlayerUnlockTechC2SPacket.ID, PlayerUnlockTechC2SPacket.CODEC)
            .add(RequestTeleportC2SPacket.ID, RequestTeleportC2SPacket.CODEC)
    );
}
