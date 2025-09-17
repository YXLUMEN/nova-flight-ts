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

export class EntityTypes {
    public static readonly BASE_ENEMY = EntityType.register("base_enemy",
        EntityType.Builder.create(BaseEnemy)
            .setDimensions(28, 24)
    );
    public static BOSS_ENTITY: EntityType<BossEntity>;
    public static readonly GUN_ENEMY_ENTITY = EntityType.register("gun_enemy",
        EntityType.Builder.create(GunEnemyEntity)
            .setDimensions(20, 20)
    );
    public static readonly MINIGUN_ENEMY_ENTITY = EntityType.register("minigun_enemy",
        EntityType.Builder.create(MiniGunEnemyEntity)
            .setDimensions(32, 32)
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
    public static PLAYER_ENTITY: EntityType<PlayerEntity>;
    public static readonly MISSILE_ENTITY = EntityType.register("missile_entity",
        EntityType.Builder.create(MissileEntity)
            .setDimensions(8, 8)
    );
    public static readonly ROCKET_ENTITY = EntityType.register("rocket_entity",
        EntityType.Builder.create(RocketEntity)
            .setDimensions(8, 8)
    );

    public static init() {
        // 避免提前引用
        this.BOSS_ENTITY = EntityType.register("boss",
            EntityType.Builder.create(BossEntity)
                .setDimensions(148, 160)
        );
        this.PLAYER_ENTITY = EntityType.register("player",
            EntityType.Builder.create(PlayerEntity)
                .setDimensions(24, 28)
        );
        Object.freeze(this);
    }
}