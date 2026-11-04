import type {ItemStack} from "../../ItemStack.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {World} from "../../../world/World.ts";
import {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {BaseWeapon} from "./BaseWeapon.ts";

export class Coilguns extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new FastBulletEntity(EntityTypes.FAST_BULLET_ENTITY, world, attacker, this.getAttackDamage(stack));
        this.setBulletByStack(bullet, attacker, stack, 6);
        world.spawnEntity(bullet);
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playLoopSound(attacker, SoundEvents.COILGUNS_FIRE_LOOP, 0.8);
    }

    public override onEndFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.stopLoopSound(attacker, SoundEvents.COILGUNS_FIRE_LOOP);
    }

    public override getUiColor(): string {
        return '#e3e3e3';
    }
}