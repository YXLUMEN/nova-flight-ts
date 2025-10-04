import {MobEntity} from "./MobEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import {StatusEffects} from "../effect/StatusEffects.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobMissileEntity} from "../projectile/MobMissileEntity.ts";

export class MissileEnemyEntity extends MobEntity {
    private static readonly bulletSpeed = 0.5;
    public color = "#ff6b6b";
    protected cooldown = 0;

    public constructor(type: EntityType<MissileEnemyEntity>, world: World) {
        super(type, world, 12);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 16)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 4);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld();
        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMC_STATUS)) return;
        if (this.cooldown-- > 0) return;
        this.cooldown = 500;

        const pos = this.getPositionRef;
        const yaw = this.getYaw();
        const missile = new MobMissileEntity(EntityTypes.MISSILE_ENTITY, world, this, yaw);
        missile.color = '#ff7777';
        missile.setMaxLifeTick(500);
        missile.setTrackingSpeed(MissileEnemyEntity.bulletSpeed);
        missile.setPosition(pos.x, pos.y);
        missile.setYaw(yaw);
        world.spawnEntity(missile);
    }

    public override isRangedAttacker(): boolean {
        return true;
    }
}