import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";

export class GunEnemyEntity extends MobEntity {
    private static readonly bulletVel = new Vec2(0, 4);
    public color = "#ff6b6b";
    protected cooldown = 0;

    public constructor(type: EntityType<GunEnemyEntity>, world: World) {
        super(type, world, 5);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 4)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 3);
    }

    public override tick() {
        super.tick();

        this.cooldown--;
        if (this.cooldown > 0) return;
        this.cooldown = 150;
        const world = this.getWorld();

        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMC_STATUS)) return;

        const pos = this.getPositionRef;
        const b = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this, 1);
        b.setVelocityByVec(GunEnemyEntity.bulletVel);
        b.setPosition(pos.x, pos.y);

        b.color = '#ff0000'
        world.spawnEntity(b);
    }
}