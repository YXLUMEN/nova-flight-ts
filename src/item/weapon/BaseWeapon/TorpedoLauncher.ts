import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {MagneticTorpedoEntity} from "../../../entity/projectile/MagneticTorpedoEntity.ts";

export class TorpedoLauncher extends BaseWeapon {
    private readonly speed = 32;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new MagneticTorpedoEntity(
            EntityTypes.MAGNETIC_TORPEDO_ENTITY,
            world,
            attacker,
            stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1),
            stack.getOrDefault(DataComponents.EXPLOSION_POWER, 16),
        );

        this.setBullet(bullet, attacker, this.speed, 0, 0);
        world.spawnEntity(bullet);
    }

    public override getUiColor(): string {
        return '#5095ff'
    }

    public override getDisplayName(): string {
        return '磁吸鱼雷发射器';
    }
}