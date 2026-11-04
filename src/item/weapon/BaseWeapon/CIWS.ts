import {BaseWeapon} from "./BaseWeapon.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {type World} from "../../../world/World.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponents} from "../../../component/DataComponents.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {clamp} from "../../../utils/math/math.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

export class CIWS extends BaseWeapon {
    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void {
        stack.set(DataComponents.FIRING, true);

        const damage = this.getAttackDamage(stack);
        const spread = this.getMaxSpread(stack);
        const speed = this.getBallisticSpeed(stack);
        for (let i = 4; i--;) {
            const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, attacker, damage);
            this.setBullet(bullet, attacker, speed, 2, spread, i * 20);
            world.spawnEntity(bullet);
        }

        const increaseHeat = this.getHeat(stack) + 3;
        this.setHeat(stack, increaseHeat);
        if (increaseHeat > this.getMaxHeat(stack)) {
            stack.setAvailable(false);
            stack.set(DataComponents.COOLDOWN_COUNTDOWN, 30);
            this.onEndFire(stack, world, attacker);
            world.playSound(null, SoundEvents.STEAM_RELEASE);
        }
    }

    public override onStartFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (!stack.isAvailable()) return;
        world.playLoopSound(attacker, SoundEvents.CIWS_FIRE_LOOP, 0.5);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity): void {
        world.stopLoopSound(attacker, SoundEvents.CIWS_FIRE_LOOP);
        stack.remove(DataComponents.FIRING);
    }

    public override inventoryTick(stack: ItemStack, world: ServerWorld, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (!holder.isPlayer() || stack.get(DataComponents.FIRING)) return;
        const currentHeat = this.getHeat(stack);
        if (currentHeat === 0) return;

        const countdown = stack.getOr(DataComponents.COOLDOWN_COUNTDOWN, 0);
        if (countdown > 0) {
            stack.set(DataComponents.COOLDOWN_COUNTDOWN, countdown - 1);
            return;
        }

        const rate = stack.getOr(DataComponents.COOLDOWN_RATE, 3);
        const cooldown = Math.max(0, currentHeat - rate);
        this.setHeat(stack, cooldown);
        if (cooldown === 0) {
            stack.setAvailable(true);
            stack.remove(DataComponents.COOLDOWN_COUNTDOWN);
        }
        if (!world.isClient) (holder as ServerPlayerEntity).syncStack(stack);
    }

    protected override getMuzzleParticles(): number {
        return 1;
    }

    public override canFire(stack: ItemStack): boolean {
        return stack.isAvailable();
    }

    public override getCooldown(stack: ItemStack): number {
        return this.getHeat(stack);
    }

    public override getMaxCooldown(stack: ItemStack): number {
        return this.getMaxHeat(stack);
    }

    public getMaxHeat(stack: ItemStack): number {
        return stack.getOr(DataComponents.MAX_HEAT, 300);
    }

    public getHeat(stack: ItemStack): number {
        return stack.getOr(DataComponents.HEAT, 0);
    }

    public setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponents.HEAT, clamp(value, 0, this.getMaxHeat(stack)));
    }

    public override getUiColor(stack: ItemStack): string {
        return stack.isAvailable() ? '#fffce0' : '#ff3636';
    }
}