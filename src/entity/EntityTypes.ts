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

export class EntityTypes {
    public static readonly BASE_ENEMY = EntityType.register("base_enemy",
        EntityType.Builder.create(BaseEnemy)
            .setDimensions(30)
    );
    public static readonly GUN_ENEMY_ENTITY = EntityType.register("gun_enemy",
        EntityType.Builder.create(GunEnemyEntity)
            .setDimensions(20)
    );
    public static readonly MINIGUN_ENEMY_ENTITY = EntityType.register("minigun_enemy",
        EntityType.Builder.create(MiniGunEnemyEntity)
            .setDimensions(32)
    );
    public static readonly MISSILE_ENEMY_ENTITY = EntityType.register("missile_enemy",
        EntityType.Builder.create(MissileEnemyEntity)
            .setDimensions(24)
            .setTrackingTickInterval(4)
    );
    public static readonly TANK_ENEMY_ENTITY = EntityType.register("tank_enemy",
        EntityType.Builder.create(TankEnemy)
            .setDimensions(30)
    );
    public static readonly BULLET_ENTITY = EntityType.register("bullet",
        EntityType.Builder.create(BulletEntity)
            .setDimensions(10)
            .setTrackingTickInterval(10)
    );
    public static readonly FAST_BULLET_ENTITY = EntityType.register("fast_bullet",
        EntityType.Builder.create(FastBulletEntity)
            .setDimensions(6)
            .setTrackingTickInterval(10)
    );
    public static readonly KINETIC_ARTILLERY_ENTITY = EntityType.register("kinetic_artillery",
        EntityType.Builder.create(ArtilleryEntity)
            .setDimensions(10)
    );
    public static readonly ENEMY_BULLET_ENTITY = EntityType.register("enemy_bullet",
        EntityType.Builder.create(MobBulletEntity)
            .setDimensions(8)
            .setTrackingTickInterval(10)
    );
    public static readonly MINI_BULLET_ENTITY = EntityType.register("mini_bullet",
        EntityType.Builder.create(MiniBulletEntity)
            .setDimensions(4)
            .setTrackingTickInterval(10)
    );
    public static readonly EXPLODE_BULLET_ENTITY = EntityType.register("explode_bullet",
        EntityType.Builder.create(ExplodeBulletEntity)
            .setDimensions(16, 18)
    );
    public static readonly PLAYER: EntityType<PlayerEntity>;
    public static readonly MISSILE_ENTITY = EntityType.register("missile_entity",
        EntityType.Builder.create(MissileEntity)
            .setDimensions(16)
    );
    public static readonly MOB_MISSILE_ENTITY = EntityType.register("mob_missile_entity",
        EntityType.Builder.create(MobMissileEntity)
            .setDimensions(16)
            .setTrackingTickInterval(6)
    );
    public static readonly ROCKET_ENTITY = EntityType.register("rocket_entity",
        EntityType.Builder.create(RocketEntity)
            .setDimensions(16)
            .setTrackingTickInterval(5)
    );
    public static readonly SPAWN_MARK_ENTITY = EntityType.register("spawn_marker_entity",
        EntityType.Builder.create(SpawnMarkerEntity)
            .setDimensions(24)
            .setTrackingTickInterval(20)
    );
    public static readonly DECOY_ENTITY = EntityType.register("decoy_entity",
        EntityType.Builder.create(DecoyEntity)
            .setDimensions(6)
            .setTrackingTickInterval(10)
    );
    public static readonly CIWS_BULLET_ENTITY = EntityType.register("ciws_bullet",
        EntityType.Builder.create(CIWSBulletEntity)
            .setDimensions(4)
            .setTrackingTickInterval(10)
    );
    public static readonly ADS_ENTITY = EntityType.register("ads_entity",
        EntityType.Builder.create(ADSEntity)
            .setDimensions(16)
            .setTrackingTickInterval(20)
    );
    public static readonly CLOUD_LIGHTNING_ENTITY = EntityType.register("cloud_lightning",
        EntityType.Builder.create(CloudLightningEntity)
            .setDimensions(40)
            .setTrackingTickInterval(10)
    );
    public static readonly TORPEDO_ENTITY = EntityType.register("torpedo",
        EntityType.Builder.create(TorpedoEntity)
            .setDimensions(10)
    );
    public static readonly EXPLOSION_ENTITY = EntityType.register('explosion',
        EntityType.Builder.create(ExplosionEntity)
            .setDimensions(0)
            .setTrackingTickInterval(40)
    );
    public static readonly TARGET_DRONE = EntityType.register('target_drone',
        EntityType.Builder.create(TargetDrone)
            .setDimensions(32)
            .setTrackingTickInterval(40)
    );
    public static readonly BASE_BOSS_ENTITY = EntityType.register("base_boss_entity",
        EntityType.Builder.create(BaseBossEntity)
            .setDimensions(148, 160)
    );
    public static readonly TNT_BOSS_ENTITY = EntityType.register('tnt_boss',
        EntityType.Builder.create(TNTBossEntity)
            .setDimensions(128, 128)
    );
    public static readonly MAGNETIC_TORPEDO_ENTITY = EntityType.register('magnetic_torpedo_entity',
        EntityType.Builder.create(MagneticTorpedoEntity)
            .setDimensions(12)
    );

    public static init() {
        (this.PLAYER as any) = EntityType.register("player",
            // @ts-ignore
            EntityType.Builder.create(PlayerEntity)
                .setDimensions(32)
        );
    }
}