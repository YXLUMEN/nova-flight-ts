import {Weapon} from "../Weapon.ts";
import {clamp, rand, randInt} from "../../../utils/math/math.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";
import type {ProjectileEntity} from "../../../entity/projectile/ProjectileEntity.ts";
import {MutVec2} from "../../../utils/math/MutVec2.ts";
import type {Entity} from "../../../entity/Entity.ts";
import type {ItemStack} from "../../ItemStack.ts";
import {DataComponentTypes} from "../../../component/DataComponentTypes.ts";

export abstract class BaseWeapon extends Weapon {
    public getFireRate(stack: ItemStack): number {
        return stack.getOrDefault(DataComponentTypes.MAX_COOLDOWN, 1);
    }

    public setFireRate(stack: ItemStack, fireRate: number) {
        stack.set(DataComponentTypes.MAX_COOLDOWN, clamp(fireRate, 0, 256));
    }

    protected setBullet(bullet: ProjectileEntity, attacker: Entity, speed: number, offset: number) {
        const world = bullet.getWorld();
        const pos = attacker.getPositionRef;
        const yaw = attacker.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const vel = new Vec2(f * speed, g * speed);
        bullet.setVelocityByVec(vel);
        bullet.setYaw(yaw);

        const completeOffset = attacker.getEntityDimension().width / 2 + offset;
        bullet.setPosition(
            pos.x + f * completeOffset,
            pos.y + g * completeOffset
        );

        for (let i = 0; i < 4; i++) {
            const a = rand(-0.41886, 0.41886);
            const speed = randInt(100, 210);
            const vel = new MutVec2((a + f) * speed, (a + g) * speed);

            world.spawnParticleByVec(
                bullet.getPositionRef, vel, rand(0.4, 0.6), rand(2, 3),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public getBallisticSpeed(): number {
        return 0;
    }
}