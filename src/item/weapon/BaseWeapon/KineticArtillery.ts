import {BaseWeapon} from "./BaseWeapon.ts";
import type {ItemStack} from "../../ItemStack.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {Entity} from "../../../entity/Entity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {ArtilleryEntity} from "../../../entity/projectile/ArtilleryEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class KineticArtillery extends BaseWeapon {
    public static readonly SPEED = 50;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new ArtilleryEntity(EntityTypes.KINETIC_ARTILLERY_ENTITY,
            world,
            attacker,
            stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 32)
        );
        this.setBullet(bullet, attacker, KineticArtillery.SPEED, 6, 0);
        world.spawnEntity(bullet);

        world.playSound(null, SoundEvents.KINETIC_ARTILLERY_FIRE, 0.4);

        if (stack.getDurability() === 0) return;
        setTimeout(() => world.playSound(null, SoundEvents.KINETIC_ARTILLERY_LOAD, 0.3), 200);
    }

    public override getUiColor(): string {
        return '#ffdddd';
    }

    public override getDisplayName(): string {
        return '动能火炮';
    }

    public override getBallisticSpeed(): number {
        return KineticArtillery.SPEED;
    }
}