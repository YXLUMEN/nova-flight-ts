import {Weapon} from "./Weapon.ts";
import type {World} from "../world/World.ts";
import type {ISpecialWeapon} from "./ISpecialWeapon.ts";
import type {LivingEntity} from "../entity/LivingEntity.ts";
import {MissileEntity} from "../entity/projectile/MissileEntity.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";
import {HALF_PI} from "../utils/math/math.ts";

export class MissileWeapon extends Weapon implements ISpecialWeapon {
    public constructor(owner: LivingEntity) {
        super(owner, 5, 1200);
    }

    public tryFire(world: World): void {
        const pos = this.owner.getPositionRef;
        const yaw = this.owner.getYaw();

        const dim = this.owner.getEntityDimension();
        const sideOffset = dim.width / 2;

        for (let i = 0; i < 6; i++) {
            const side = (i % 2 === 0) ? 1 : -1;
            const layer = Math.floor(i);

            let spawnX = pos.x + Math.cos(yaw + HALF_PI) * side * sideOffset
                + Math.cos(yaw) * layer * 10;
            let spawnY = pos.y + Math.sin(yaw + HALF_PI) * side * sideOffset
                + Math.sin(yaw) * layer * 5;

            spawnX += (Math.random() - 0.5) * 0.2;
            spawnY += (Math.random() - 0.5) * 0.2;

            const driftAngle = yaw + side * (HALF_PI + (Math.random() - 0.5) * 0.2);

            const missile = new MissileEntity(EntityTypes.MISSILE_ENTITY, world, this.owner, yaw, driftAngle);
            missile.setPosition(spawnX, spawnY);
            world.spawnEntity(missile);
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