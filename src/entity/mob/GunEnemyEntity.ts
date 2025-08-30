import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    public color = "#ff6b6b";

    protected cooldown = 0;

    private static readonly bulletVel = new Vec2(0, 200);

    public constructor(type: EntityType<GunEnemyEntity>, world: World) {
        super(type, world, 5);
    }

    public override tick(dt: number) {
        super.tick(dt);

        this.cooldown--;
        if (this.cooldown > 0) return;
        this.cooldown = 150;
        const world = this.getWorld();

        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMC_STATUS)) return;

        const pos = this.getMutPos;
        const b = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this, 1);
        b.setVelocity(GunEnemyEntity.bulletVel);
        b.setPos(pos.x, pos.y);

        b.color = '#ff0000'
        world.spawnEntity(b);
    }
}