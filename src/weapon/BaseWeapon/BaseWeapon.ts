import {Weapon} from "../Weapon.ts";
import {clamp, rand, randInt} from "../../utils/math/math.ts";
import type {LivingEntity} from "../../entity/LivingEntity.ts";
import {Vec2} from "../../utils/math/Vec2.ts";
import type {ProjectileEntity} from "../../entity/projectile/ProjectileEntity.ts";
import {MutVec2} from "../../utils/math/MutVec2.ts";

export abstract class BaseWeapon extends Weapon {
    private fireRate: number;

    protected constructor(owner: LivingEntity, damage: number, fireRate: number) {
        super(owner, damage, fireRate);
        this.fireRate = fireRate;
    }

    public getFireRate(): number {
        return this.fireRate;
    }

    public setFireRate(fireRate: number) {
        this.fireRate = clamp(fireRate, 0, 256);
        this.setMaxCooldown(this.fireRate);
    }

    protected setBullet(bullet: ProjectileEntity, speed: number, offset: number) {
        const world = bullet.getWorld();
        const pos = this.owner.getPositionRef;
        const yaw = this.owner.getYaw();
        const f = Math.cos(yaw);
        const g = Math.sin(yaw);

        const vel = new Vec2(f * speed, g * speed);
        bullet.setVelocityByVec(vel);
        bullet.setYaw(yaw);

        const completeOffset = this.owner.getEntityDimension().width / 2 + offset;
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