import type {World} from "../../world/World.ts";
import {MissileEntity} from "../../entity/projectile/MissileEntity.ts";
import {EntityTypes} from "../../entity/EntityTypes.ts";
import {HALF_PI} from "../../utils/math/math.ts";
import {SoundEvents} from "../../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {SoundSystem} from "../../sound/SoundSystem.ts";
import type {Entity} from "../../entity/Entity.ts";
import type {ItemStack} from "../ItemStack.ts";

export class MissileWeapon extends SpecialWeapon {
    public missileCounts = 8;
    public explosionRadius = 64;
    public explosionDamage = 10;

    public override tryFire(stack: ItemStack, world: World, attacker: Entity): void {
        const pos = attacker.getPositionRef;
        let i = 1;

        const schedule = world.scheduleInterval(0.1, () => {
            if (i++ > this.missileCounts) {
                schedule.cancel();
                SoundSystem.stopLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
                return;
            }

            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = attacker.getYaw();

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, attacker, driftAngle);
            missile.explosionDamage = this.explosionDamage;
            missile.explosionRadius = this.explosionRadius;
            missile.setHoverDir(side);
            missile.setYaw(yaw);
            missile.setPosition(pos.x, pos.y);
            world.spawnEntity(missile);
        });

        world.schedule(1.6, () => SoundSystem.playSound(SoundEvents.MISSILE_BLASTOFF));

        if (this.missileCounts > 8) {
            SoundSystem.playLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
        } else {
            SoundSystem.playSound(SoundEvents.MISSILE_LAUNCH_COMP);
        }
        this.setCooldown(stack, this.getMaxCooldown(stack));
    }

    public bindKey(): string {
        return 'Digit1';
    }

    public override getDisplayName(): string {
        return '导弹';
    }

    public override getUiColor(): string {
        return '#ff9f43';
    }
}