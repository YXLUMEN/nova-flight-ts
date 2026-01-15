import type {Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {CloudLightningEntity} from "../../../entity/projectile/CloudLightningEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {randInt} from "../../../utils/math/math.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class CloudLightningConduits extends BaseWeapon {
    private readonly speed = 12;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const damage = randInt(1, stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 12));

        const cloud = new CloudLightningEntity(EntityTypes.CLOUD_LIGHTNING_ENTITY, world, attacker, damage);
        this.setBullet(cloud, attacker, this.speed, 10, 0);
        world.spawnEntity(cloud);

        world.playSound(null, SoundEvents.CANNON90_FIRE);
    }

    public override getUiColor(): string {
        return '#b09eff';
    }

    public override getDisplayName(): string {
        return '天云闪电';
    }
}