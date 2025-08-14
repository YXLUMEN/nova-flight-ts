import {Game} from "../Game.ts";
import {Weapon} from "./Weapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {BulletEntity} from "../entity/BulletEntity.ts";
import {PlayerEntity} from "../entity/PlayerEntity.ts";
import type {Entity} from "../entity/Entity.ts";

export class BulletGun extends Weapon {
    public readonly fireRate = 0.15;

    public override tryFire() {
        if (this.getCooldown > 0) return;
        if (this.owner instanceof PlayerEntity) {
            const input = this.owner.input;
            if (!input.isDown(" ", "space") && !input.shoot) return;
        }

        BulletGun.spawnBullet(this.owner.pos.x, this.owner.pos.y - this.owner.radius - 4, this.owner);
        this.cooldown = this.fireRate;
    }

    public override get getMaxCooldown(): number {
        return 0;
    }

    public get displayName(): string {
        return '机炮';
    }

    public get uiColor(): string {
        return '#fff';
    }

    public static spawnBullet(x: number, y: number, own: Entity) {
        const b = new BulletEntity(new Vec2(x, y), new Vec2(0, -520), own);
        b.radius = 3.5;
        Game.instance.bullets.push(b);
    }
}
