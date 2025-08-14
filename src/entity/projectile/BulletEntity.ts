import {ProjectileEntity} from "../ProjectileEntity.ts";
import {PI2} from "../../math/math.ts";

export class BulletEntity extends ProjectileEntity {
    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, PI2);
        ctx.fill();
        ctx.restore();
    }

    public override onHit(): void {
        this.onDeath();
    };
}