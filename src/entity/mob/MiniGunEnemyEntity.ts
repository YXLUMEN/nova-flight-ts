import {StatusEffects} from "../effect/StatusEffects.ts";
import {MiniBulletEntity} from "../projectile/MiniBulletEntity.ts";
import {EntityTypes} from "../EntityTypes.ts";
import {MobEntity} from "./MobEntity.ts";
import {EntityType} from "../EntityType.ts";
import type {World} from "../../world/World.ts";
import {EntityAttributes} from "../attribute/EntityAttributes.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";
import {randInt} from "../../utils/math/math.ts";

export class MiniGunEnemyEntity extends MobEntity {
    private static readonly bulletSpeed = 4;
    public color = "#ac0000";
    private cooldown: number;
    private fireCount = 0;
    private fireCD = 0;

    public constructor(type: EntityType<MiniGunEnemyEntity>, world: World) {
        super(type, world, 10);
        this.cooldown = randInt(0, 200);
    }

    public override createLivingAttributes() {
        return super.createLivingAttributes()
            .addWithBaseValue(EntityAttributes.GENERIC_MAX_HEALTH, 128)
            .addWithBaseValue(EntityAttributes.GENERIC_ATTACK_DAMAGE, 6);
    }

    public override tick() {
        super.tick();

        const world = this.getWorld() as ServerWorld;
        if (world.isClient) return;

        if (world.empBurst > 0 || this.hasStatusEffect(StatusEffects.EMC_STATUS)) return;
        if (this.cooldown > 0) {
            this.cooldown--;
            return;
        }

        if (this.fireCD-- > 0) return;
        this.fireCD = 10;

        if (this.fireCount > 16) {
            this.cooldown = 500;
            this.fireCount = 0;
            return;
        }

        const pos = this.getPositionRef;
        const yaw = this.getYaw();
        const b = new MiniBulletEntity(EntityTypes.ENEMY_BULLET_ENTITY, world, this, 1);
        b.setVelocity(Math.cos(yaw) * MiniGunEnemyEntity.bulletSpeed, Math.sin(yaw) * MiniGunEnemyEntity.bulletSpeed);
        b.setPosition(pos.x, pos.y);

        b.color = '#b10000';
        b.edgeColor = '#ff0000';
        world.spawnEntity(b);
        this.fireCount++;
    }

    public override isRangedAttacker(): boolean {
        return true;
    }
}