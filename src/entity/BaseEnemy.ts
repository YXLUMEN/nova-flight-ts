import {Game} from "../Game.ts";
import {Vec2} from "../math/Vec2.ts";
import {MobEntity} from "./MobEntity.ts";

export class BaseEnemy extends MobEntity {
    private static readonly rotation = Math.PI;

    public speed = 110;
    public t = Math.random() * 1000;

    constructor(pos: Vec2) {
        super(pos, 16, 1, 1);
    }

    public update(dt: number) {
        this.t += dt;
        // 下落 + 轻微蛇形
        this.pos.y += this.speed * dt;
        this.pos.x += Math.sin(this.t * 3) * 40 * dt;

        if (this.pos.y > Game.H + 40) this.dead = true;
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        // 机身
        ctx.translate(this.pos.x, this.pos.y);
        ctx.rotate(BaseEnemy.rotation);

        ctx.fillStyle = "#ff6b6b";
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(14, 6);
        ctx.lineTo(0, 12);
        ctx.lineTo(-14, 6);
        ctx.closePath();
        ctx.fill();
        // 轮廓
        ctx.strokeStyle = "rgba(0,0,0,.2)";
        ctx.stroke();
        ctx.restore();
    }
}