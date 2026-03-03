import {type ItemStack} from "../../ItemStack.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {FastBulletEntity} from "../../../entity/projectile/FastBulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../../world/World.ts";

export class Coilguns extends BaseWeapon {
    public static readonly SPEED = 38;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new FastBulletEntity(EntityTypes.FAST_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 4));
        this.setBullet(bullet, attacker, Coilguns.SPEED, 6, 1);
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

    public override getDisplayName(): string {
        return '线圈炮';
    }

    public override getUiColor(): string {
        return '#e3e3e3';
    }

    public override getBallisticSpeed(): number {
        return Coilguns.SPEED;
    }
}