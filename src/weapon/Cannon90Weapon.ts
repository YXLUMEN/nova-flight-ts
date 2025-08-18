import {World} from "../World.ts";
import type {Entity} from "../entity/Entity.ts";
import {MutVec2} from "../math/MutVec2.ts";
import {ExplodeBulletEntity} from "../entity/ExplodeBulletEntity.ts";
import {BaseWeapon} from "./BaseWeapon.ts";

export class Cannon90Weapon extends BaseWeapon {
    public bulletVel = new MutVec2(0, -320);
    public explosionDamage = 5;
    public explosionRadius = 96;

    public constructor(owner: Entity) {
        super(owner, 4, 0.85);
    }

    public override tryFire(world: World): void {
        const pos = new MutVec2(this.owner.pos.x, this.owner.pos.y - this.owner.boxRadius - 12);
        ExplodeBulletEntity.spawnExplodeBullet(world, pos, this.bulletVel, this.owner, this.getDamage(), 12, {
            explosionRadius: this.explosionRadius,
            damage: this.explosionDamage,
            sparks: 4,
            fastSparks: 2,
        });

        this.setCooldown(this.getFireRate());
    }

    public override getDisplayName(): string {
        return "90mm机炮";
    }

    public override getUiColor(): string {
        return "#ffcb6a";
    }
}