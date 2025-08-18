import {MobEntity} from "./MobEntity.ts";
import {MutVec2} from "../math/MutVec2.ts";
import type {World} from "../World.ts";
import {BulletEntity} from "./BulletEntity.ts";
import {Vec2} from "../math/Vec2.ts";

export class GunEnemyEntity extends MobEntity {
    public override speed = 80;
    public color = "#ff6b6b";

    private cooldown = 0;
    private readonly interval = 2;

    private static readonly bulletVel = new Vec2(0, 200);

    constructor(pos: MutVec2) {
        super(pos, 16, 2, 5);
    }

    public override update(world: World, dt: number) {
        super.update(world, dt);

        this.cooldown -= dt;
        if (this.cooldown > 0) return;
        this.cooldown = this.interval;

        if (world.empBurst > 0 || this.hasStatus('EMC')) return;

        const b = new BulletEntity(this.pos, GunEnemyEntity.bulletVel, this, 1, 4);
        b.color = '#ff0000'
        world.bullets.push(b);
    }

    public override render(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.fillRect(this.pos.x, this.pos.y, 20, 20);
        ctx.restore();
    }
}