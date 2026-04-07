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
    private readonly MAX_SPREAD = 4;
    private readonly BULLET_SPEED = 45;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, attacker, stack.getOrDefault(DataComponents.ATTACK_DAMAGE, 1));

        const maxSpread = stack.getOrDefault(DataComponents.MAX_SPREAD, this.MAX_SPREAD);
        this.setBullet(bullet, attacker, this.BULLET_SPEED, 4, maxSpread);
        if (maxSpread > 0.5) stack.set(DataComponents.MAX_SPREAD, maxSpread - 0.1);

        world.spawnEntity(bullet);
    }

    public override onStartFire(_stack: ItemStack, world: World, attacker: Entity) {
        if (!world.isClient) return;
        world.playLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity) {
        stack.set(DataComponents.MAX_SPREAD, this.MAX_SPREAD);

        if (!world.isClient) return;
        if (world.stopLoopSound(attacker, SoundEvents.MINIGUN_FIRE_LOOP)) {
            world.playSound(attacker, SoundEvents.MINIGUN_FIRE_TAIL);
        }
    }

    public override getMaxSpread(item: ItemStack): number {
        return item.getOrDefault(DataComponents.MAX_SPREAD, this.MAX_SPREAD);
    }

    protected override getMuzzleParticles(): number {
        return 3;
    }

    public override getDisplayName(): string {
        return 'MiniGun';
    }

    public override getUiColor(): string {
        return '#dcdcdc';
    }

    public override getBallisticSpeed(): number {
        return this.BULLET_SPEED;
    }
}