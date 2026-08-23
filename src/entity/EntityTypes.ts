import {PlayerEntity} from "./player/PlayerEntity.ts";
import {ExplodeBulletEntity} from "./projectile/ExplodeBulletEntity.ts";
import {BulletEntity} from "./projectile/BulletEntity.ts";
import {TankEnemy} from "./mob/TankEnemy.ts";
import {GunEnemyEntity} from "./mob/GunEnemyEntity.ts";
import {BaseEnemy} from "./mob/BaseEnemy.ts";
import {EntityType} from "./EntityType.ts";
import {MiniBulletEntity} from "./projectile/MiniBulletEntity.ts";
import {MiniGunEnemyEntity} from "./mob/MiniGunEnemyEntity.ts";
import {MissileEntity} from "./projectile/MissileEntity.ts";
import {RocketEntity} from "./projectile/RocketEntity.ts";
import {SpawnMarkerEntity} from "./SpawnMarkerEntity.ts";
import {DecoyEntity} from "./DecoyEntity.ts";
import {MissileEnemyEntity} from "./mob/MissileEnemyEntity.ts";
import {CIWSBulletEntity} from "./projectile/CIWSBulletEntity.ts";
import {ADSEntity} from "./ADSEntity.ts";
import {MobMissileEntity} from "./projectile/MobMissileEntity.ts";
import {FastBulletEntity} from "./projectile/FastBulletEntity.ts";
import {CloudLightningEntity} from "./projectile/CloudLightningEntity.ts";
import {ArtilleryEntity} from "./projectile/ArtilleryEntity.ts";
import {TorpedoEntity} from "./projectile/TorpedoEntity.ts";
import {ExplosionEntity} from "./ExplosionEntity.ts";
import {TargetDrone} from "./TargetDrone.ts";
import {TNTBossEntity} from "./mob/TNTBossEntity.ts";
import {BaseBossEntity} from "./mob/BaseBossEntity.ts";
import {MobBulletEntity} from "./projectile/MobBulletEntity.ts";
import {MagneticTorpedoEntity} from "./projectile/MagneticTorpedoEntity.ts";
import {DevourerBoss} from "./mob/DevourerBoss.ts";
import {TrailblazerEntity} from "./TrailblazerEntity.ts";
import {SmokeBomb} from "./projectile/SmokeBomb.ts";
import {BlastBullet} from "./projectile/BlastBullet.ts";

export class EntityTypes {
    public static readonly BASE_ENEMY = EntityType.register('base_enemy',
        EntityType.Builder.create(BaseEnemy)
            .sized(30)
    );
    public static readonly GUN_ENEMY_ENTITY = EntityType.register('gun_enemy',
        EntityType.Builder.create(GunEnemyEntity)
            .sized(20)
    );
    public static readonly MINIGUN_ENEMY_ENTITY = EntityType.register('minigun_enemy',
        EntityType.Builder.create(MiniGunEnemyEntity)
            .sized(32)
    );
    public static readonly MISSILE_ENEMY_ENTITY = EntityType.register('missile_enemy',
        EntityType.Builder.create(MissileEnemyEntity)
            .sized(24)
            .setTrackingTickInterval(4)
    );
    public static readonly TANK_ENEMY_ENTITY = EntityType.register('tank_enemy',
        EntityType.Builder.create(TankEnemy)
            .sized(30)
    );
    public static readonly BULLET_ENTITY = EntityType.register('bullet',
        EntityType.Builder.create(BulletEntity)
            .sized(10)
            .setTrackingTickInterval(10)
    );
    public static readonly FAST_BULLET_ENTITY = EntityType.register('fast_bullet',
        EntityType.Builder.create(FastBulletEntity)
            .sized(6)
            .setTrackingTickInterval(10)
    );
    public static readonly KINETIC_ARTILLERY_ENTITY = EntityType.register('kinetic_artillery',
        EntityType.Builder.create(ArtilleryEntity)
            .sized(10)
    );
    public static readonly ENEMY_BULLET_ENTITY = EntityType.register('enemy_bullet',
        EntityType.Builder.create(MobBulletEntity)
            .sized(8)
            .setTrackingTickInterval(10)
    );
    public static readonly MINI_BULLET_ENTITY = EntityType.register('mini_bullet',
        EntityType.Builder.create(MiniBulletEntity)
            .sized(4)
            .setTrackingTickInterval(10)
    );
    public static readonly EXPLODE_BULLET_ENTITY = EntityType.register('explode_bullet',
        EntityType.Builder.create(ExplodeBulletEntity)
            .sized(16, 18)
    );
    public static readonly PLAYER: EntityType<PlayerEntity>;
    public static readonly MISSILE_ENTITY = EntityType.register('missile_entity',
        EntityType.Builder.create(MissileEntity)
            .sized(16)
    );
    public static readonly MOB_MISSILE_ENTITY = EntityType.register('mob_missile_entity',
        EntityType.Builder.create(MobMissileEntity)
            .sized(16)
            .setTrackingTickInterval(6)
    );
    public static readonly ROCKET_ENTITY = EntityType.register('rocket_entity',
        EntityType.Builder.create(RocketEntity)
            .sized(16)
            .setTrackingTickInterval(5)
    );
    public static readonly SPAWN_MARK_ENTITY = EntityType.register('spawn_marker_entity',
        EntityType.Builder.create(SpawnMarkerEntity)
            .sized(24)
            .setTrackingTickInterval(20)
    );
    public static readonly DECOY_ENTITY = EntityType.register('decoy_entity',
        EntityType.Builder.create(DecoyEntity)
            .sized(6)
            .setTrackingTickInterval(10)
    );
    public static readonly CIWS_BULLET_ENTITY = EntityType.register('ciws_bullet',
        EntityType.Builder.create(CIWSBulletEntity)
            .sized(4)
            .setTrackingTickInterval(10)
    );
    public static readonly ADS_ENTITY = EntityType.register('ads_entity',
        EntityType.Builder.create(ADSEntity)
            .sized(16)
            .setTrackingTickInterval(20)
    );
    public static readonly CLOUD_LIGHTNING_ENTITY = EntityType.register('cloud_lightning',
        EntityType.Builder.create(CloudLightningEntity)
            .sized(40)
            .setTrackingTickInterval(10)
    );
    public static readonly TORPEDO_ENTITY = EntityType.register('torpedo',
        EntityType.Builder.create(TorpedoEntity)
            .sized(10)
    );
    public static readonly EXPLOSION_ENTITY = EntityType.register('explosion',
        EntityType.Builder.create(ExplosionEntity)
            .sized(0)
            .setTrackingTickInterval(40)
    );
    public static readonly TARGET_DRONE = EntityType.register('target_drone',
        EntityType.Builder.create(TargetDrone)
            .sized(32)
            .setTrackingTickInterval(40)
    );
    public static readonly BASE_BOSS_ENTITY = EntityType.register('base_boss_entity',
        EntityType.Builder.create(BaseBossEntity)
            .sized(148, 160)
    );
    public static readonly TNT_BOSS_ENTITY = EntityType.register('tnt_boss',
        EntityType.Builder.create(TNTBossEntity)
            .sized(128)
    );
    public static readonly MAGNETIC_TORPEDO_ENTITY = EntityType.register('magnetic_torpedo_entity',
        EntityType.Builder.create(MagneticTorpedoEntity)
            .sized(12)
    );
    public static readonly DEVOURER_BOSS_ENTITY = EntityType.register('devourer_boss',
        EntityType.Builder.create(DevourerBoss)
            .sized(48)
    );
    public static readonly TRAILBLAZER_ENTITY = EntityType.register('trailblazer_entity',
        EntityType.Builder.create(TrailblazerEntity)
            .sized(24)
    );
    public static readonly SMOKE_BOMB = EntityType.register('smoke_bomb',
        EntityType.Builder.create(SmokeBomb)
            .sized(20)
            .setTrackingTickInterval(10)
    );
    public static readonly BLAST_BULLET = EntityType.register('blast_bullet',
        EntityType.Builder.create(BlastBullet)
            .sized(4)
            .setTrackingTickInterval(10)
    );

    public static init() {
        (this.PLAYER as any) = EntityType.register('player',
            // @ts-ignore
            EntityType.Builder.create(PlayerEntity)
                .sized(32)
        );
        Object.freeze(this);
    }
}