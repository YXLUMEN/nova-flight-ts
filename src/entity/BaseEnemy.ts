import {MutVec2} from "../math/MutVec2.ts";
import {MobEntity} from "./MobEntity.ts";
import type {World} from "../World.ts";

export class BaseEnemy extends MobEntity {
    public override speed = 110;
    public color = '#ff6b6b';

    public constructor(world: World, pos: MutVec2, health: number, worth: number) {
        super(world, pos, 16, health, worth);
    }

    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        ctx.fillStyle = this.color;
        ctx.strokeStyle = "rgba(0,0,0,.2)";

        ctx.beginPath();
        ctx.moveTo(0, 18);
        ctx.lineTo(-14, -6);
        ctx.lineTo(0, -12);
        ctx.lineTo(14, -6);
        ctx.closePath();

        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}