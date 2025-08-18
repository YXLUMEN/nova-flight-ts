import {ProjectileEntity} from "./ProjectileEntity.ts";
import {PI2} from "../math/math.ts";
import type {World} from "../World.ts";

export class BulletEntity extends ProjectileEntity {
    public override render(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.boxRadius, 0, PI2);
        ctx.fill();
        ctx.restore();
    }

    public override onHit(world: World): void {
        this.onDeath(world);
    };
}