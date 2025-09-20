import {BaseWeapon} from "./BaseWeapon.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {type World} from "../../../world/World.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";

export class CIWS extends BaseWeapon {
    private static readonly BULLET_SPEED = 24;
    private static readonly MAX_HEAT = 300;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1));
        this.setBullet(bullet, attacker, CIWS.BULLET_SPEED, 2, 2, 1);
        world.spawnEntity(bullet);

        const increaseHeat = this.getHeat(stack) + 3;
        this.setHeat(stack, increaseHeat);
        if (increaseHeat > CIWS.MAX_HEAT) {
            stack.set(DataComponentTypes.OVERHEAT, true);
            this.onEndFire(world, stack);
            return;
        }

        this.setCooldown(stack, this.getFireRate(stack));
    }

    public override onStartFire(world: World, stack: ItemStack): void {
        if (this.isOverHeat(stack)) return;
        world.playLoopSound(SoundEvents.CIWS_FIRE_LOOP);
        stack.set(DataComponentTypes.ACTIVE, true);
    }

    public override onEndFire(world: World, stack: ItemStack): void {
        world.stopLoopSound(SoundEvents.CIWS_FIRE_LOOP);
        stack.set(DataComponentTypes.ACTIVE, false);
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity) {
        super.inventoryTick(stack, world, holder);

        if (stack.getOrDefault(DataComponentTypes.ACTIVE, true)) return;
        const currentHeat = this.getHeat(stack);
        if (currentHeat === 0) return;

        const cooldown = Math.max(0, currentHeat - 4);
        this.setHeat(stack, cooldown);
        if (cooldown === 0) {
            stack.set(DataComponentTypes.OVERHEAT, false);
            if (holder instanceof PlayerEntity) holder.wasFire = false;
        }
    }

    public override canFire(stack: ItemStack): boolean {
        return !this.isOverHeat(stack) &&
            stack.getOrDefault(DataComponentTypes.COOLDOWN, 0) === 0;
    }

    public override getCooldown(stack: ItemStack): number {
        return this.getHeat(stack);
    }

    public override getMaxCooldown(): number {
        return CIWS.MAX_HEAT;
    }

    private getHeat(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.HEAT, 0);
    }

    private setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.HEAT, Math.min(value, CIWS.MAX_HEAT));
    }

    private isOverHeat(stack: ItemStack): boolean {
        return stack.getOrDefault(DataComponentTypes.OVERHEAT, false);
    }

    public override getDisplayName(): string {
        return '近防炮';
    }

    public override getUiColor(stack: ItemStack): string {
        return this.isOverHeat(stack) ? '#ff3636' : '#fffce0';
    }

    public override getBallisticSpeed(): number {
        return CIWS.BULLET_SPEED;
    }
}