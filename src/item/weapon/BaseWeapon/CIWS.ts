import {BaseWeapon} from "./BaseWeapon.ts";
import {type ItemStack} from "../../ItemStack.ts";
import {type World} from "../../../world/World.ts";
import {type Entity} from "../../../entity/Entity.ts";
import {EntityTypes} from "../../../entity/EntityTypes.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import {SoundEvents} from "../../../sound/SoundEvents.ts";
import {CIWSBulletEntity} from "../../../entity/projectile/CIWSBulletEntity.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {clamp} from "../../../utils/math/math.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

export class CIWS extends BaseWeapon {
    private static readonly BULLET_SPEED = 60;

    protected override onFire(stack: ItemStack, world: ServerWorld, attacker: Entity) {
        const damage = stack.getOrDefault(DataComponentTypes.ATTACK_DAMAGE, 1);
        for (let i = 4; i--;) {
            const bullet = new CIWSBulletEntity(EntityTypes.CIWS_BULLET_ENTITY, world, attacker, damage);
            this.setBullet(bullet, attacker, CIWS.BULLET_SPEED, 2, 2, i * 20);
            world.spawnEntity(bullet);
        }

        const increaseHeat = this.getHeat(stack) + 3;
        this.setHeat(stack, increaseHeat);
        if (increaseHeat > this.getMaxHeat(stack)) {
            stack.setAvailable(false);
            this.onEndFire(stack, world, attacker);
        }
    }

    public override onStartFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (!stack.isAvailable()) return;
        if (world.isClient) {
            world.playLoopSound(attacker, SoundEvents.CIWS_FIRE_LOOP, 0.8);
        }
        stack.set(DataComponentTypes.FIRING, true);
    }

    public override onEndFire(stack: ItemStack, world: World, attacker: Entity): void {
        if (world.isClient) {
            world.stopLoopSound(attacker, SoundEvents.CIWS_FIRE_LOOP);
        }
        stack.set(DataComponentTypes.FIRING, false);
    }

    public override inventoryTick(stack: ItemStack, world: World, holder: Entity, slot: number, selected: boolean) {
        super.inventoryTick(stack, world, holder, slot, selected);

        if (!holder.isPlayer() || stack.getOrDefault(DataComponentTypes.FIRING, true)) return;
        const currentHeat = this.getHeat(stack);
        if (currentHeat === 0) return;

        const cooldown = Math.max(0, currentHeat - 4);
        this.setHeat(stack, cooldown);
        if (cooldown === 0) {
            stack.setAvailable(true);
        }
        if (!world.isClient) (holder as ServerPlayerEntity).addChange(stack);
    }

    protected override getMuzzleParticles(): number {
        return 1;
    }

    protected override getAmmoConsume(): number {
        return 0;
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
        return stack.getOrDefault(DataComponentTypes.MAX_HEAT, 300);
    }

    public setMaxHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.MAX_HEAT, Math.max(0, value | 0));
    }

    public getHeat(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.HEAT, 0);
    }

    public setHeat(stack: ItemStack, value: number): void {
        stack.set(DataComponentTypes.HEAT, clamp(value, 0, this.getMaxHeat(stack)));
    }

    public override getDisplayName(): string {
        return '近防炮';
    }

    public override getUiColor(stack: ItemStack): string {
        return stack.isAvailable() ? '#fffce0' : '#ff3636';
    }

    public override getBallisticSpeed(): number {
        return CIWS.BULLET_SPEED;
    }
}