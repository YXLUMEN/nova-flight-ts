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

        let totalWidth = 0;
        for (const txt of entity.damage) {
            totalWidth += ctx.measureText(txt).width + r;
        }
        if (entity.damage.length > 0) {
            totalWidth -= r;
        }

        let currentX = pos.x - (totalWidth / 2) | 0;
        for (let i = 0; i < entity.damage.length; i++) {
            const txt = entity.damage[i];
            ctx.fillText(txt, currentX, pos.y + 32);
            currentX += ctx.measureText(txt).width + r;
        }
        ctx.restore();
    }
}