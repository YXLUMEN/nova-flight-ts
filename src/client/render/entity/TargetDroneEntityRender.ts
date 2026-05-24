import type {EntityRenderer} from "./EntityRenderer.ts";
import type {TargetDrone} from "../../../entity/TargetDrone.ts";
import {UITheme} from "../ui/theme.ts";

export class TargetDroneEntityRender implements EntityRenderer<TargetDrone> {
    public render(entity: TargetDrone, ctx: CanvasRenderingContext2D, tickDelta: number): void {
        const pos = entity.getLerpPos(tickDelta);
        const dim = entity.getDimensions();

        const r = dim.halfWidth;

        ctx.save();
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - r, pos.y - r, dim.width, dim.height);

        ctx.font = UITheme.font;
        ctx.fillStyle = '#fff';
        ctx.fillText(entity.dps, pos.x, pos.y + 32);
        ctx.restore();
    }
}