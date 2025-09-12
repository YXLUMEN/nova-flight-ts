import {Weapon} from "./Weapon.ts";
import type {World} from "../world/World.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {HALF_PI} from "../utils/math/math.ts";

export class MissileWeapon extends Weapon implements ISpecialWeapon {
    public missileCounts = 8;
    public explosionRadius = 64;
    public explosionDamage = 10;

    public constructor(owner: LivingEntity) {
        super(owner, 5, 1200);
    }

    public tryFire(world: World): void {
        const pos = this.owner.getPositionRef;
        let i = 1;

        const schedule = this.owner.getWorld().scheduleInterval(0.2, () => {
            if (i++ > this.missileCounts) {
                schedule.cancel();
                return;
            }

            const side = (i % 2 === 0) ? 1 : -1;
            const yaw = this.owner.getYaw();

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, this.owner, yaw, driftAngle);
            missile.explosionDamage = this.explosionDamage;
            missile.explosionRadius = this.explosionRadius;
            missile.setPosition(pos.x, pos.y);
            world.spawnEntity(missile);
        });

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