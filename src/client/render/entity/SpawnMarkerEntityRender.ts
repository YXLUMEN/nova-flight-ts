import {type SpawnMarkerEntity} from "../../../entity/SpawnMarkerEntity.ts";
import {SingleCache} from "../cache/SingleCache.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedEntityRender} from "../cache/CachedEntityRender.ts";

export class SpawnMarkerEntityRender extends CachedEntityRender<number, SpawnMarkerEntity> {
    private readonly bounding = new AABB(-13, -13, 13, 13);

    public constructor() {
        super(new SingleCache());
    }

    protected drawSprite(ctx: CanvasRenderingContext2D): void {
        const half = 12;
        const halfGap = 3.6;

        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ff5f42';

        // 顶边
        ctx.beginPath();
        ctx.moveTo(-half, -half);
        ctx.lineTo(-halfGap, -half);
        ctx.moveTo(halfGap, -half);
        ctx.lineTo(half, -half);
        ctx.stroke();

        // 右边
        ctx.beginPath();
        ctx.moveTo(half, -half);
        ctx.lineTo(half, -halfGap);
        ctx.moveTo(half, halfGap);
        ctx.lineTo(half, half);
        ctx.stroke();

        // 底边
        ctx.beginPath();
        ctx.moveTo(half, half);
        ctx.lineTo(halfGap, half);
        ctx.moveTo(-halfGap, half);
        ctx.lineTo(-half, half);
        ctx.stroke();

        // 左边
        ctx.beginPath();
        ctx.moveTo(-half, half);
        ctx.lineTo(-half, halfGap);
        ctx.moveTo(-half, -halfGap);
        ctx.lineTo(-half, -half);
        ctx.stroke();
    }

    protected spriteKey(): number {
        return 0;
    }

    protected override transform(ctx: CanvasRenderingContext2D, entity: SpawnMarkerEntity, alpha: number) {
        super.transform(ctx, entity, alpha);

        if (entity.age <= 32) return;

        const progress = Math.min(entity.age / 80, 1);
        const curve = Math.pow(10, progress) - 1;
        const currentFrequency = 0.06 * (1 + curve);
        ctx.globalAlpha = (Math.sin(entity.age * currentFrequency) + 1) / 2;
    }

    protected bounds(): AABB {
        return this.bounding;
    }
}
