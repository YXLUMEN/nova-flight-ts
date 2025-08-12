import {Game} from "../Game.ts";
import {Weapon} from "./Weapon.ts";
import {Vec2} from "../math/Vec2.ts";
import {Bullet} from "../entity/Bullet.ts";
import {Player} from "../entity/Player.ts";
import type {Entity} from "../entity/Entity.ts";

export class BulletGun extends Weapon {
    fireRate = 0.15;

    public tryFire() {
        if (this.cooldown > 0) return;
        if (this.owner instanceof Player) {
            const input = this.owner.input;
            if (!input.isDown(" ", "space") && !input.shoot) return;
        }

        BulletGun.spawnBullet(this.owner.pos.x, this.owner.pos.y - this.owner.radius - 4, this.owner);
        this.cooldown = this.fireRate;
    }

    static spawnBullet(x: number, y: number, own: Entity) {
        const b = new Bullet(new Vec2(x, y), new Vec2(0, -520), own);
        b.radius = 3.5;
        Game.instance.bullets.push(b);
    }
}
