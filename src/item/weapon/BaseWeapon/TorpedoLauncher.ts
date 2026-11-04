import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {MagneticTorpedoEntity} from "../../../entity/projectile/MagneticTorpedoEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class TorpedoLauncher extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new MagneticTorpedoEntity(
            EntityTypes.MAGNETIC_TORPEDO_ENTITY,
            world,
            attacker,
            stack.getOr(DataComponents.ATTACK_DAMAGE, 1),
            stack.getOr(DataComponents.EXPLOSION_POWER, 16),
        );

        this.setBulletByStack(bullet, attacker, stack);
        world.spawnEntity(bullet);
        world.playSound(null, SoundEvents.TORPEDOES_FIRE, 0.6);
    }

    public override getUiColor(): string {
        return '#5095ff'
    }
}