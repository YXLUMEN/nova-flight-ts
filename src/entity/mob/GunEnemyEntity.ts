import {MobEntity} from "./MobEntity.ts";
import type {World} from "../../world/World.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityType} from "../EntityType.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {randInt} from "../../utils/math/math.ts";

export class GunEnemyEntity extends MobEntity {
    private static readonly bulletSpeed = 5;
    public color = "#ff6b6b";
    protected cooldown;

    public constructor(type: EntityType<GunEnemyEntity>, world: World) {
        super(type, world, 5);
        this.cooldown = randInt(0, 200);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 4)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 3);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMC_STATUS)) return;
        if (this.cooldown-- > 0) return;
        this.cooldown = 150;

        const pos = this.getPositionRef;
        const yaw = this.getYaw();
        const b = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, this, 1);
        b.setVelocity(Math.cos(yaw) * GunEnemyEntity.bulletSpeed, Math.sin(yaw) * GunEnemyEntity.bulletSpeed);
        b.setPosition(pos.x, pos.y);

        b.color = '#b10000';
        b.edgeColor = '#ff0000';
        world.spawnEntity(b);
    }

    public override isRangedAttacker(): boolean {
        return true;
    }
}