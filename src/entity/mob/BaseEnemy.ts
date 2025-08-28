import {MobEntity} from "./MobEntity.ts";
import {type World} from "../../World.ts";
import {type EntityType} from "../EntityType.ts";

export class BaseEnemy extends MobEntity {
    public override speed = 110;
    public color = '#ff6b6b';

    public constructor(type: EntityType<BaseEnemy>, world: World, maxHealth: number, worth: number) {
        super(type, world, maxHealth, worth);
    }

    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.getMutPos.x, this.getMutPos.y);

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