import {PlayerEntity} from "./player/PlayerEntity.ts";
import {ExplodeBulletEntity} from "./projectile/ExplodeBulletEntity.ts";
import {BulletEntity} from "./projectile/BulletEntity.ts";
import {TankEnemy} from "./mob/TankEnemy.ts";
import {GunEnemyEntity} from "./mob/GunEnemyEntity.ts";
import {BossEntity} from "./mob/BossEntity.ts";
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

export class EntityTypes {
    public static readonly BASE_ENEMY = EntityType.register("base_enemy",
        EntityType.Builder.create(BaseEnemy)
            .setDimensions(28, 24)
    );
    public static readonly BOSS_ENTITY: EntityType<BossEntity>;
    public static readonly GUN_ENEMY_ENTITY = EntityType.register("gun_enemy",
        EntityType.Builder.create(GunEnemyEntity)
            .setDimensions(20, 20)
    );
    public static readonly MINIGUN_ENEMY_ENTITY = EntityType.register("minigun_enemy",
        EntityType.Builder.create(MiniGunEnemyEntity)
            .setDimensions(32, 32)
    );
    public static readonly MISSILE_ENEMY_ENTITY = EntityType.register("missile_enemy",
        EntityType.Builder.create(MissileEnemyEntity)
            .setDimensions(24, 24)
    );
    public static readonly TANK_ENEMY_ENTITY = EntityType.register("tank_enemy",
        EntityType.Builder.create(TankEnemy)
            .setDimensions(16, 16)
    );
    public static readonly BULLET_ENTITY = EntityType.register("bullet",
        EntityType.Builder.create(BulletEntity)
            .setDimensions(6, 6)
    );
    public static readonly MINI_BULLET_ENTITY = EntityType.register("mini_bullet",
        EntityType.Builder.create(MiniBulletEntity)
            .setDimensions(4, 4)
    );
    public static readonly EXPLODE_BULLET_ENTITY = EntityType.register("explode_bullet",
        EntityType.Builder.create(ExplodeBulletEntity)
            .setDimensions(12, 12)
    );
    public static readonly PLAYER_ENTITY: EntityType<PlayerEntity>;
    public static readonly MISSILE_ENTITY = EntityType.register("missile_entity",
        EntityType.Builder.create(MissileEntity)
            .setDimensions(8, 8)
    );
    public static readonly ROCKET_ENTITY = EntityType.register("rocket_entity",
        EntityType.Builder.create(RocketEntity)
            .setDimensions(8, 8)
    );
    public static readonly SPAWN_MARK_ENTITY = EntityType.register("spawn_marker_entity",
        EntityType.Builder.create(SpawnMarkerEntity)
            .setDimensions(24, 24)
    );
    public static readonly DECOY_ENTITY = EntityType.register("decoy_entity",
        EntityType.Builder.create(DecoyEntity)
            .setDimensions(6, 6)
    );
    public static readonly CIWS_BULLET_ENTITY = EntityType.register("ciws_bullet",
        EntityType.Builder.create(CIWSBulletEntity)
            .setDimensions(4, 4)
    );
    public static readonly ADS_ENTITY = EntityType.register("ads_entity",
        EntityType.Builder.create(ADSEntity)
            .setDimensions(16, 16)
    );

    public static init() {
        (this.BOSS_ENTITY as any) = EntityType.register("boss",
            EntityType.Builder.create(BossEntity)
                .setDimensions(148, 160)
        );
        (this.PLAYER_ENTITY as any) = EntityType.register("player",
            EntityType.Builder.create(PlayerEntity)
                .setDimensions(24, 28)
        );
    }
}