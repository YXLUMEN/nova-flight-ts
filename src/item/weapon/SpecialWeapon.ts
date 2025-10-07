import {Weapon} from "./Weapon.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {World} from "../../world/World.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";

export abstract class SpecialWeapon extends Weapon {
    public override inventoryTick(stack: ItemStack, world: World, _holder: Entity) {
        const cooldown = this.getCooldown(stack);
        if (cooldown === 0) return;
        if (this.shouldCooldown(stack)) this.setCooldown(stack, cooldown - 1);
        if (this.isReady(stack)) this.onReady(world);
    }

    public isReady(stack: ItemStack): boolean {
        return this.getCooldown(stack) === 0;
    }

    public onReady(world: World): void {
        if (!world.isClient) return;
        world.playSound(null, SoundEvents.WEAPON_READY);
    }

    public abstract bindKey(): string;
}