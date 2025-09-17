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

    protected setBullet(bullet: ProjectileEntity, attacker: Entity, speed: number, offset: number, maxSpread = 1) {
        const world = bullet.getWorld();
        const pos = attacker.getPositionRef;

        const yaw = attacker.getYaw();

        const spread = Math.max(maxSpread, 1) * 0.01745329;
        const offsetYaw = yaw + rand(-spread, spread);
        const f = Math.cos(offsetYaw);
        const g = Math.sin(offsetYaw);

        const vel = new Vec2(f * speed, g * speed);
        bullet.setVelocityByVec(vel);
        bullet.setYaw(offsetYaw);

        const completeOffset = attacker.getEntityDimension().width / 2 + offset;
        bullet.setPosition(
            pos.x + f * completeOffset,
            pos.y + g * completeOffset
        );

        for (let i = 0; i < 4; i++) {
            const angleOffset = rand(-0.41886, 0.41886);
            const particleYaw = Math.atan2(g, f) + angleOffset;

            const px = Math.cos(particleYaw);
            const py = Math.sin(particleYaw);

            const speed = randInt(100, 210);
            const vel = new MutVec2(px * speed, py * speed);

            world.spawnParticleByVec(
                bullet.getPositionRef.clone(), vel, rand(0.4, 0.6), rand(2, 3),
                "#ffaa33", "#ff5454", 0.6, 80
            );
        }
    }

    public getBallisticSpeed(): number {
        return 0;
    }
}