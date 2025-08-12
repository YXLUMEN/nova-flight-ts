import {rand} from "../math/uit.ts";
import {Game} from "../Game.ts";
import {Vec2} from "../math/Vec2.ts";
import {Entity} from "./Entity.ts";

export class Star extends Entity {
    speed: number;
    alpha: number;

    constructor() {
        super(new Vec2(rand(0, Game.W), rand(0, Game.H)), rand(0.5, 2));
        this.speed = rand(20, 80);
        this.alpha = rand(0.3, 0.9);
    }

    public update(dt: number) {
        this.pos.y += this.speed * dt;
        if (this.pos.y > Game.H) {
            this.pos.y = -5;
            this.pos.x = rand(0, Game.W);
            this.speed = rand(20, 80);
            this.radius = rand(0.5, 2);
            this.alpha = rand(0.3, 0.9);
        }
    }

    public render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = "#cfe3ff";
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}