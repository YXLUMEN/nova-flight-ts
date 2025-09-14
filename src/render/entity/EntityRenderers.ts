import type {EntityType} from "../../entity/EntityType.ts";
import type {EntityRenderer} from "./EntityRenderer.ts";
import type {Entity} from "../../entity/Entity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {BaseEnemyRender} from "./BaseEnemyRender.ts";
import {GunEnemyEntityRender} from "./GunEnemyEntityRender.ts";
import {BulletEntityRender} from "./BulletEntityRender.ts";
import {PlayerEntityRender} from "./PlayerEntityRender.ts";
import {BossEntityRender} from "./BossEntityRender.ts";
import {MiniGunEnemyEntityRender} from "./MiniGunEnemyEntityRender.ts";
import {MissileEntityRender} from "./MissileEntityRender.ts";
import {RocketEntityRender} from "./RocketEntityRender.ts";

export class EntityRenderers {
    private static readonly RENDERER_FACTORIES = new Map<EntityType<Entity>, EntityRenderer<Entity>>();

    public static getRenderer<T extends Entity>(entity: T): EntityRenderer<T> {
        return this.RENDERER_FACTORIES.get(entity.getType())!;
    }

    public static registryRenders(): void {
        const baseEnemy = new BaseEnemyRender();
        const bullet = new BulletEntityRender();
        const rocket = new RocketEntityRender();
        this.register(EntityTypes.BASE_ENEMY, baseEnemy);
        this.register(EntityTypes.TANK_ENEMY_ENTITY, baseEnemy);
        this.register(EntityTypes.BOSS_ENTITY, new BossEntityRender());
        this.register(EntityTypes.GUN_ENEMY_ENTITY, new GunEnemyEntityRender());
        this.register(EntityTypes.MINIGUN_ENEMY_ENTITY, new MiniGunEnemyEntityRender());
        this.register(EntityTypes.BULLET_ENTITY, bullet);
        this.register(EntityTypes.MINI_BULLET_ENTITY, bullet);
        this.register(EntityTypes.EXPLODE_BULLET_ENTITY, bullet);
        this.register(EntityTypes.PLAYER_ENTITY, new PlayerEntityRender());
        this.register(EntityTypes.ROCKET_ENTITY, rocket);
        this.register(EntityTypes.EMP_ROCKET_ENTITY, rocket);
        this.register(EntityTypes.BURST_ROCKET_ENTITY, rocket);
        this.register(EntityTypes.AP_ROCKET_ENTITY, rocket);
        this.register(EntityTypes.MISSILE_ENTITY, new MissileEntityRender());
        this.compileRenders();
    }

    private static register<T extends Entity>(type: EntityType<T>, renderer: EntityRenderer<T>): void {
        this.RENDERER_FACTORIES.set(type, renderer);
    }

    private static compileRenders() {
        Object.freeze(this.RENDERER_FACTORIES);
    }
}