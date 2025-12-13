import {World} from "../../world/World.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponentTypes} from "../../component/DataComponentTypes.ts";

export class BombWeapon extends SpecialWeapon {
    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) {
            world.createExplosion(null, null, attacker.getX(), attacker.getY(), {
                damage: stack.getOrDefault(DataComponentTypes.EXPLOSION_DAMAGE, 16),
                explosionRadius: stack.getOrDefault(DataComponentTypes.EXPLOSION_RADIUS, 256),
                shake: 0.3,
                attacker,
            });
        }

        world.playSound(attacker, SoundEvents.EXPLOSION);
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public override getDisplayName(): string {
        return '炸弹';
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}