import type {EntityRenderer} from "./EntityRenderer.ts";
import type {TargetDrone} from "../../../entity/TargetDrone.ts";
import {UITheme} from "../ui/theme.ts";

export class TargetDroneEntityRender implements EntityRenderer<TargetDrone> {
    public render(entity: TargetDrone, ctx: CanvasRenderingContext2D, tickDelta: number, offsetX: number, offsetY: number): void {
        ctx.save();
        const pos = entity.getLerpPos(tickDelta);
        ctx.fillStyle = entity.color;
        ctx.fillRect(pos.x - 16 + offsetX, pos.y - 16 + offsetY, 32, 32);

        ctx.font = UITheme.font;
        ctx.fillStyle = '#fff';

        let totalWidth = 0;
        for (const txt of entity.damage) {
            totalWidth += ctx.measureText(txt).width + 16;
        }
        if (entity.damage.length > 0) {
            totalWidth -= 16;
        }

        let currentX = pos.x - (totalWidth / 2) | 0;
        for (let i = 0; i < entity.damage.length; i++) {
            const txt = entity.damage[i];
            ctx.fillText(txt, currentX, pos.y + 32);
            currentX += ctx.measureText(txt).width + 16;
        }
        ctx.restore();
    }
}