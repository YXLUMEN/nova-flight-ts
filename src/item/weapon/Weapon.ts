import {type World} from "../../world/World.ts";
import {clamp} from "../../utils/math/math.ts";
import type {Entity} from "../../entity/Entity.ts";
import {Item} from "../Item.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

export abstract class Weapon extends Item {
    public override inventoryTick(stack: ItemStack, _world: World, _holder: Entity): void {
        const cooldown = stack.getOrDefault(DataComponentTypes.COOLDOWN, 0);
        if (cooldown > 0 && this.shouldCooldown(stack)) this.setCooldown(stack, cooldown - 1);
    }

    // 不会检查冷却
    public abstract tryFire(stack: ItemStack, world: World, attacker: Entity): void;

    public onStartFire(_stack: ItemStack, _world: World, _attacker: Entity): void {
    }

    public onEndFire(_stack: ItemStack, _world: World, _attacker: Entity): void {
    }

    public canFire(stack: ItemStack): boolean {
        return this.getCooldown(stack) <= 0;
    }

    public getAttackPower(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
    }

    public getMaxCooldown(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.MAX_COOLDOWN, 0);
    }

    public setMaxCooldown(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.MAX_COOLDOWN, clamp(value, 0, 256));
    }

    public getCooldown(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.COOLDOWN, 10);
    }

    public setCooldown(stack: ItemStack, value: number) {
        stack.set(DataComponentTypes.COOLDOWN, clamp(value, 0, this.getMaxCooldown(stack)));
    }

    public shouldCooldown(_stack: ItemStack): boolean {
        return true;
    }

    public abstract getUiColor(stack: ItemStack): string;
}
