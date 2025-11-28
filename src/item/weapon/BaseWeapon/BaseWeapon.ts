import {Weapon} from "../Weapon.ts";
import {rand, randInt} from "../../../utils/math/math.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import type {ProjectileEntity} from "../../../entity/projectile/ProjectileEntity.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";
import type {World} from "../../../world/World.ts";
import type {ClientWorld} from "../../../client/ClientWorld.ts";
import type {ServerWorld} from "../../../server/ServerWorld.ts";
import type {PlayerEntity} from "../../../entity/player/PlayerEntity.ts";
import type {ServerPlayerEntity} from "../../../server/entity/ServerPlayerEntity.ts";

export abstract class BaseWeapon extends Weapon {
    public override inventoryTick(stack: ItemStack, _world: World, holder: Entity, _slot: number, selected: boolean): void {
        const cooldown = stack.getOrDefault(DataComponentTypes.COOLDOWN, 0);
        if (cooldown > 0 && this.shouldCooldown(stack)) this.setCooldown(stack, cooldown - 1);

        if (holder.isPlayer() && stack.getOrDefault(DataComponentTypes.RELOADING, false)) {
            this.reloadAction(holder as PlayerEntity, stack, selected);
        }
    }

    public override tryFire(stack: ItemStack, world: World, attacker: Entity) {
        if (!attacker.isPlayer()) return;

        const currentAmmo = stack.getDurability();
        if (currentAmmo === 0 && stack.isDamageable()) return;
        if (world.isClient) {
            this.spawnMuzzle(world as ClientWorld, attacker, this.getMuzzleParticles());
            return;
        }

        // reload
        const player = attacker as ServerPlayerEntity;
        const manager = player.cooldownManager;
        if (manager.isCoolingDown(this)) {
            if (!stack.getOrDefault(DataComponentTypes.RELOADING, false)) {
                return;
            }
            manager.set(this, 0);
            stack.set(DataComponentTypes.RELOADING, false);
        }

        stack.setDurability(currentAmmo - this.getAmmoConsume());
        this.onFire(stack, world as ServerWorld, attacker);

        // fire rate
        this.setCooldown(stack, this.getFireRate(stack));
        player.syncStack(stack);
    }

    protected abstract onFire(stack: ItemStack, world: ServerWorld, attacker: Entity): void;

    public onReload(player: ServerPlayerEntity, stack: ItemStack): void {
        if (stack.getDamage() === 0) return;

        const manager = player.cooldownManager;
        if (manager.isCoolingDown(this)) return;

        manager.set(this, this.getReloadTick(stack));
        stack.set(DataComponentTypes.RELOADING, true);
        player.syncStack(stack);
    }

    protected restoreAmmo(stack: ItemStack, player: PlayerEntity) {
        stack.set(DataComponentTypes.RELOADING, false);
        player.cooldownManager.set(this, 0);
        stack.setDamage(0);
    }

    private reloadAction(player: PlayerEntity, stack: ItemStack, selected: boolean): void {
        const manager = player.cooldownManager;

        if (!selected) {
            manager.set(this, 0);
            stack.set(DataComponentTypes.RELOADING, false);
            return;
        }

        if (!manager.isCoolingDown(this)) {
            this.restoreAmmo(stack, player);
        }
    }

    public override canFire(stack: ItemStack): boolean {
        return this.getCooldown(stack) <= 1;
    }

    public getFireRate(stack: ItemStack): number {
        return this.getMaxCooldown(stack);
    }

    public setFireRate(stack: ItemStack, fireRate: number) {
        this.setMaxCooldown(stack, fireRate);
    }

    public getReloadTick(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.MAX_RELOAD_TIME, 0);
    }

    public getBallisticSpeed(): number {
        return 0;
    }

    protected getAmmoConsume(): number {
        return 1;
    }

    protected getMuzzleParticles(): number {
        return 4;
    }

    protected setBullet(bullet: ProjectileEntity, attacker: Entity, speed: number, offset: number, maxSpread = 1, margin = 0): void {
        const pos = attacker.getPositionRef;

        const yaw = attacker.getYaw();

        const spread = Math.max(maxSpread, 1) * 0.01745329;
        const offsetYaw = yaw + rand(-spread, spread);
        const f = Math.cos(offsetYaw);
        const g = Math.sin(offsetYaw);

        const vel = new Vec2(f * speed, g * speed);
        bullet.setVelocityByVec(vel);
        bullet.setYaw(offsetYaw);

        const completeOffset = attacker.getWidth() / 2 + offset;
        bullet.setPosition(
            pos.x + f * completeOffset + f * margin,
            pos.y + g * completeOffset + g * margin,
        );
    }

    protected spawnMuzzle(world: ClientWorld, entity: Entity, particles: number): void {
        const pos = entity.getPositionRef;
        const yaw = entity.getYaw();
        const offset = entity.getWidth() / 2;
        const x = Math.cos(yaw) * offset + pos.x;
        const y = Math.sin(yaw) * offset + pos.y;

        for (let i = 0; i < particles; i++) {
            const angleOffset = rand(-0.41886, 0.41886);
            const particleYaw = yaw + angleOffset;

            const px = Math.cos(particleYaw);
            const py = Math.sin(particleYaw);

            const speed = randInt(100, 210);

            world.addParticle(
                x, y,
                px * speed, py * speed,
                rand(0.4, 0.6), rand(2, 3),
                "#ffaa33", "#ff5454",
                0.6, 80
            );
        }
    }
}