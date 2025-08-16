import {MobEntity} from "../MobEntity.ts";
import {Vec2} from "../../math/Vec2.ts";
import type {World} from "../../World.ts";
import {throttleTimeOut} from "../../utils/uit.ts";
import {BulletEntity} from "../projectile/BulletEntity.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    public color = "#ff6b6b";

    private static readonly bulletVel = new Vec2(0, 200);

    constructor(pos: Vec2) {
        super(pos, 16, 2, 5);
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        this.mobFire(world);
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, 20, 20);
        ctx.restore();
    }

    private mobFire = throttleTimeOut((world) => {
        const b = new BulletEntity(this.pos, GunEnemyEntity.bulletVel, this, 1, 4);
        b.color = '#ff0000'
        world.bullets.push(b);
    }, 2000);
}