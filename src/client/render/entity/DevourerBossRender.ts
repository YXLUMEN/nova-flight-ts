import type {EntityRenderer} from "./EntityRenderer.ts";
import {DevourerBoss} from "../../../entity/mob/DevourerBoss.ts";
import {HALF_PI, lerp, PI2} from "../../../utils/math/math.ts";

type ColorConfig = { body: string; head: string; border: string; glow: string };

export class DevourerBossRender implements EntityRenderer<DevourerBoss> {
    public render(entity: DevourerBoss, ctx: CanvasRenderingContext2D, tickDelta: number): void {
        const positions = entity.segmentPoses;
        const prevPositions = entity.prevSegmentPoses;

        const phase = entity.getPhase();
        const colors = this.phaseColors[phase];

        ctx.save();
        ctx.fillStyle = colors.body;
        ctx.strokeStyle = colors.border;

        ctx.beginPath();
        for (let i = entity.segmentCount - 1; i > 0; i--) {
            const curr = i << 1;
            const prevX = prevPositions[curr];
            const prevY = prevPositions[curr + 1];

            const currX = positions[curr];
            const currY = positions[curr + 1];

            const x = lerp(tickDelta, prevX, currX);
            const y = lerp(tickDelta, prevY, currY);

            ctx.moveTo(x + 22, y);
            ctx.arc(x, y, 22, 0, PI2);
        }
        ctx.fill();
        ctx.stroke();

        const hx = lerp(tickDelta, prevPositions[0], positions[0]);
        const hy = lerp(tickDelta, prevPositions[1], positions[1]);
        this.drawHead(ctx, entity, hx, hy, tickDelta, colors);

        ctx.restore();
    }

    private drawHead(
        ctx: CanvasRenderingContext2D,
        entity: DevourerBoss,
        x: number, y: number,
        tickDelta: number,
        colors: ColorConfig
    ) {
        const yaw = entity.getLerpYaw(tickDelta);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(yaw + HALF_PI);

        ctx.fillStyle = colors.head;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 2.5;

        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(18, 10);
        ctx.lineTo(0, 20);
        ctx.lineTo(-18, 10);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.shadowBlur = 0;
        ctx.restore();
    }

    private phaseColors: ColorConfig[] = [
        {
            body: '#6a5acd',
            head: '#5a4abd',
            border: '#332277',
            glow: '#aa99ff'
        },
        {
            body: '#9932cc',
            head: '#aa33aa',
            border: '#551155',
            glow: '#ff44ff'
        },
        {
            body: '#9932cc',
            head: '#aa33aa',
            border: '#551155',
            glow: '#ff44ff'
        },
        {
            body: '#cc2222',
            head: '#ff3333',
            border: '#880000',
            glow: '#ff6600'
        }
    ];
}
