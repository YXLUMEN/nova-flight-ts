import {BaseWeapon} from "./BaseWeapon.ts";
import type {World} from "../../world/World.ts";
import type {LivingEntity} from "../../entity/LivingEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {RocketEntity} from "../../entity/projectile/RocketEntity.ts";
import {EMPRocketEntity} from "../../entity/projectile/EMPRocketEntity.ts";
import {BurstRocketEntity} from "../../entity/projectile/BurstRocketEntity.ts";
import {APRocketEntity} from "../../entity/projectile/APRocketEntity.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import {ClusterRocketEntity} from "../../entity/projectile/ClusterRocketEntity.ts";

export class RocketWeapon extends BaseWeapon {
    private speed: number = 6;
    private finishShooting = true;

    public randomRocketEnable = false;
    public rocketCounts = 8;
    public explosionDamage = 12;
    public explosionRadius = 72;

    public constructor(owner: LivingEntity) {
        super(owner, 8, 120);
    }

    public override tryFire(world: World): void {
        this.finishShooting = false;

        let i = 1;
        const schedule = this.owner.getWorld().scheduleInterval(0.1, () => {
            if (i++ > this.rocketCounts) {
                schedule.cancel();
                this.finishShooting = true;
                return;
            }

            const yaw = this.owner.getYaw();

            let rocket;
            if (this.randomRocketEnable) {
                rocket = this.randomRocket(world);
            } else {
                rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner);
                rocket.explosionDamage = this.explosionDamage;
                rocket.explosionRadius = this.explosionRadius;
            }
            this.setBullet(rocket, 6, yaw);
            world.spawnEntity(rocket);

            const ownerYaw = this.owner.getYaw();
            this.owner.updateVelocity(-0.6, Math.cos(ownerYaw), Math.sin(ownerYaw));
        });

        SoundSystem.playSound(SoundEvents.MISSILE_LAUNCH, 0.2);
        this.setCooldown(this.getMaxCooldown());
    }

    private randomRocket(world: World) {
        const rnd = Math.random();
        if (rnd < 0.1) {
            return new EMPRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner, 1);
        } else if (rnd < 0.3) {
            return new BurstRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner, 4);
        } else if (rnd < 0.4) {
            return new APRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner);
        } else if (rnd < 0.6) {
            return new ClusterRocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner, 6, 100);
        } else {
            const rocket = new RocketEntity(EntityTypes.ROCKET_ENTITY, world, this.owner);
            rocket.explosionDamage = this.explosionDamage;
            rocket.explosionRadius = this.explosionRadius;
            return rocket;
        }
    }

    public override getDisplayName(): string {
        return "火箭发射器";
    }

    public override getUiColor(): string {
        return "#ffdc92";
    }

    public override getBallisticSpeed(): number {
        return this.speed;
    }

    public override shouldCooldown(): boolean {
        return this.finishShooting;
    }
}