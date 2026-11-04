import {type World} from "../../../world/World.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {MiniBulletEntity} from "../../../entity/projectile/MiniBulletEntity.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";

export class MiniGun extends BaseWeapon {
    private readonly START_SPREAD = 4;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, attacker, this.getAttackDamage(stack));
        this.setBulletByStack(bullet, attacker, stack, 4);

        // reduce spread while firing
        const maxSpread = this.getMaxSpread(stack);
        if (maxSpread > 0.5) stack.set(DataComponents.MAX_SPREAD, maxSpread - 0.1);

        world.spawnEntity(bullet);
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity) {
        stack.set(DataComponents.MAX_SPREAD, this.START_SPREAD);

        if (!world.isClient) return;
        if (world.stopLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP)) {
            world.playSound(attacker, SoundEvents.MINIGUN_FIRE_TAIL);
        }
    }

    protected override getMuzzleParticles(): number {
        return 3;
    }

    public override getUiColor(): string {
        return '#dcdcdc';
    }
}