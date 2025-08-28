import {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import {MutVec2} from "../utils/math/MutVec2.ts";
import {ExplodeBulletEntity} from "../entity/projectile/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";
import {Vec2} from "../utils/math/Vec2.ts";
import {EntityTypes} from "../entity/EntityTypes.ts";

export class Cannon90Weapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -320);
    public explosionDamage = 5;
    public explosionRadius = 96;

    public constructor(owner: Entity) {
        super(owner, 4, 0.85);
    }

    public override tryFire(world: World): void {
        const pos = this.owner.getMutPos;
        const bullet = new ExplodeBulletEntity(EntityTypes.EXPLODE_BULLET_ENTITY,
            world, this.owner, this.getDamage(), {
                explosionRadius: this.explosionRadius,
                damage: this.explosionDamage,
                sparks: 4,
                fastSparks: 2,
            });
        bullet.setPos(pos.x, pos.y - this.owner.getDimensions().height - 12);
        bullet.setVelocity(Vec2.formVec(this.bulletVel));
        world.spawnEntity(bullet);

        this.setCooldown(this.getFireRate());
    }

    public override getDisplayName(): string {
        return "90mm机炮";
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }
}