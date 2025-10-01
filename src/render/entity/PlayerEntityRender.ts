import type {EntityRenderer} from "./EntityRenderer.ts";
import {type PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {HALF_PI} from "../../utils/math/math.ts";

export class PlayerEntityRender implements EntityRenderer<PlayerEntity> {
    public render(player: PlayerEntity, ctx: CanvasRenderingContext2D, offsetX: number = 0, offsetY: number = 0) {
        ctx.save();
        ctx.translate(player.getPositionRef.x + offsetX, player.getPositionRef.y + offsetY);
        ctx.rotate(player.getYaw() + HALF_PI);
        // 机身
        const grad = ctx.createLinearGradient(0, -20, 0, 20);
        grad.addColorStop(0, "#7ee3ff");
        grad.addColorStop(1, "#2aa9ff");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(14, 8);
        ctx.lineTo(0, 16);
        ctx.lineTo(-14, 8);
        ctx.closePath();
        ctx.fill();

        // 发光
        ctx.strokeStyle = "rgba(140,245,255,.6)";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 喷口
        ctx.fillStyle = "rgba(255,200,120,.9)";
        ctx.beginPath();
        ctx.moveTo(-6, 16);
        ctx.lineTo(0, 24 + Math.random() * 6);
        ctx.lineTo(6, 16);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
}