import {type Entity} from "../../../entity/Entity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {MiniBulletEntity} from "../../../entity/projectile/MiniBulletEntity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {type World} from "../../../world/World.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";

export class StormFire extends BaseWeapon {
    public readonly CHARGING_TIME = 14;
    private readonly BULLET_SPEED = 60;

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (world.isClient && holder.isPlayer() && holder.cooldownManager.getCooldownTicks(this) === 10) {
            world.playSound(null, SoundEvents.SHELL_RELOAD);
        }

        if (!stack.contains(DataComponents.CHARGING_PROGRESS)) return;
        if (!selected) {
            stack.remove(DataComponents.CHARGING_PROGRESS);
            return;
        }

        const charging = stack.getOr(DataComponents.CHARGING_PROGRESS, 0) - 1;
        if (charging <= 0) {
            if (world.isClient) {
                stack.set(DataComponents.FIRING, true);
                world.playLoopSound(holder, SoundEvents.STORM_FIRE_LOOP, 0.6);
            }
            stack.remove(DataComponents.CHARGING_PROGRESS);
            return;
        }

        stack.set(DataComponents.CHARGING_PROGRESS, Math.max(charging, 0));
    }

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (stack.contains(DataComponents.CHARGING_PROGRESS)) return;
        super.tryFire(stack, world, attacker);
    }

    protected onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        const bullet = new MiniBulletEntity(EntityTypes.MINI_BULLET_ENTITY, world, attacker, stack.getOr(DataComponents.ATTACK_DAMAGE, 1));
        this.setBullet(bullet, attacker, this.BULLET_SPEED, 4, 1.5);
        world.spawnEntity(bullet);
    }

    public override onStartFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (stack.contains(DataComponents.CHARGING_PROGRESS) || this.getCooldown(stack) > 0) return;
        stack.set(DataComponents.CHARGING_PROGRESS, this.CHARGING_TIME);

        if (!world.isClient) return;
        world.playSound(attacker, SoundEvents.STORM_FIRE_WARMUP, 0.8);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity) {
        this.setCooldown(stack, 30);
        stack.remove(DataComponents.CHARGING_PROGRESS);

        if (!world.isClient) return;

        stack.remove(DataComponents.FIRING);
        if (world.stopLoopSound(attacker, SoundEvents.STORM_FIRE_LOOP)) {
            world.playSound(attacker, SoundEvents.STORM_FIRE_END);
        }
    }

    public override getDisplayName(): string {
        return '火风暴机关炮';
    }

    public override getMaxSpread(): number {
        return 2;
    }

    protected override getMuzzleParticles(): number {
        return 2;
    }

    public getBallisticSpeed(): number {
        return this.BULLET_SPEED;
    }

    public getUiColor(): string {
        return '#ff4b4b';
    }
}