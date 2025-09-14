import type {World} from "../world/World.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {HALF_PI} from "../utils/math/math.ts";
import {SoundEvents} from "../sound/SoundEvents.ts";
import {SpecialWeapon} from "./SpecialWeapon.ts";
import {SoundSystem} from "../sound/SoundSystem.ts";

export class MissileWeapon extends SpecialWeapon {
    public missileCounts = 8;
    public explosionRadius = 64;
    public explosionDamage = 10;

    public constructor(owner: LivingEntity) {
        super(owner, 5, 1000);
    }

    public tryFire(world: World): void {
        const pos = this.owner.getPositionRef;
        let i = 1;

        const schedule = this.owner.getWorld().scheduleInterval(0.1, () => {
            if (i++ > this.missileCounts) {
                schedule.cancel();
                SoundSystem.stopLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
                return;
            }

            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = this.owner.getYaw();

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, this.owner, driftAngle);
            missile.explosionDamage = this.explosionDamage;
            missile.explosionRadius = this.explosionRadius;
            missile.setHoverDir(side);
            missile.setYaw(yaw);
            missile.setPosition(pos.x, pos.y);
            world.spawnEntity(missile);
        });

        this.owner.getWorld().schedule(1.6, () => SoundSystem.playSound(SoundEvents.MISSILE_BLASTOFF));

        if (this.missileCounts > 8) {
            SoundSystem.playLoopSound(SoundEvents.MISSILE_LAUNCH_LOOP);
        } else {
            SoundSystem.playSound(SoundEvents.MISSILE_LAUNCH_COMP);
        }
        this.setCooldown(this.getMaxCooldown());
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