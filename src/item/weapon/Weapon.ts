import {type World} from "../../world/World.ts";
import {clamp} from "../../utils/math/math.ts";
import type {Entity} from "../../entity/Entity.ts";
import {Item} from "../Item.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";

export abstract class Weapon extends Item {
    public abstract tryFire(stack: ItemStack, world: World, attacker: Entity): void;

    public onStartFire(_stack: ItemStack, _world: World, _attacker: Entity): void {
    }

    /**
     * 停止开火以及删除物品时触发
     * */
    public onEndFire(_stack: ItemStack, _world: World, _attacker: Entity): void {
    }

    public canFire(stack: ItemStack): boolean {
        return this.getCooldown(stack) <= 0;
    }

    public getAttackPower(stack: ItemStack): number {
        return stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1);
    }

    public getMaxCooldown(stack: ItemStack): number {
        return stack.getOrDefault(DataComponents.MAX_COOLDOWN, 1);
    }

    public setMaxCooldown(stack: ItemStack, value: number) {
        stack.set(DataComponents.MAX_COOLDOWN, clamp(value, 0, 256));
    }

    public getCooldown(stack: ItemStack): number {
        return stack.getOrDefault(DataComponents.COOLDOWN, 10);
    }

    public setCooldown(stack: ItemStack, value: number) {
        stack.set(DataComponents.COOLDOWN, clamp(value, 0, this.getMaxCooldown(stack)));
    }

    public shouldCooldown(_stack: ItemStack): boolean {
        return true;
    }

    public abstract getUiColor(stack: ItemStack): string;
}
