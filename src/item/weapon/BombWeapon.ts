import {World} from "../../world/World.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";
import {DataComponents} from "../../component/DataComponents.ts";
import {ExplosionVisual} from "../../world/element/explosion/ExplosionVisual.ts";
import {ExplosionConfigs, ExplosionBehaviour} from "../../world/element/explosion/ExplosionConfigs.ts";

export class BombWeapon extends SpecialWeapon {
    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) {
            const visual = new ExplosionVisual(stack.getOr(DataComponents.EXPLOSION_RADIUS, 256));
            visual.shake = 0.4;

            world.createExplosion(
                attacker,
                null,
                attacker.getX(),
                attacker.getY(),
                stack.getOr(DataComponents.EXPLOSION_POWER, 16),
                new ExplosionConfigs(ExplosionBehaviour.ONLY_DAMAGE, undefined, false),
                visual
            );
        }
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}