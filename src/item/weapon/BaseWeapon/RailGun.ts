import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class RailGun extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new FastBulletEntity(EntityTypes.FAST_BULLET_ENTITY, world, attacker, this.getAttackDamage(stack));
        this.setBulletByStack(bullet, attacker, stack, 6);
        world.spawnEntity(bullet);

        world.playSound(null, SoundEvents.RAILGUNS_FIRE, 0.3);
    }

    public override getUiColor(): string {
        return '#e3e3e3';
    }
}