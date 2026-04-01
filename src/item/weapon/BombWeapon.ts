import {World} from "../../world/World.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {ExplosionVisual} from "../../world/explosion/ExplosionVisual.ts";
import {BehaviourEnum, ExplosionBehavior} from "../../world/explosion/ExplosionBehavior.ts";

export class BombWeapon extends SpecialWeapon {
    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) {
            const visual = new ExplosionVisual(stack.getOrDefault(DataComponents.EXPLOSION_RADIUS, 256));
            visual.shake = 0.3;

            world.createExplosion(
                attacker,
                null,
                attacker.getX(),
                attacker.getY(),
                stack.getOrDefault(DataComponents.EXPLOSION_POWER, 16),
                new ExplosionBehavior(BehaviourEnum.ONLY_DAMAGE, undefined, false),
                visual
            );
        }
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public override getDisplayName(): string {
        return '炸弹';
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}