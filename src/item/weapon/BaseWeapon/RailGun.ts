import {type Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class RailGun extends BaseWeapon {
    public static readonly SPEED = 52;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new FastBulletEntity(EntityTypes.FAST_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 16));
        this.setBullet(bullet, attacker, RailGun.SPEED, 6, 1);
        world.spawnEntity(bullet);

        world.playSound(null, SoundEvents.RAILGUNS_FIRE, 0.3);
    }

    public override getUiColor(): string {
        return '#e3e3e3';
    }

    public override getDisplayName(): string {
        return '轨道炮';
    }

    public override getBallisticSpeed(): number {
        return RailGun.SPEED;
    }
}