import type {BulletEntity} from "../../../entity/projectile/BulletEntity.ts";
import {PI2} from "../../../utils/math/math.ts";
import {AABB} from "../../../utils/math/AABB.ts";
import {CachedSpriteRenderer} from "../cache/CachedSpriteRenderer.ts";
import {MapRenderCache} from "../cache/MapRenderCache.ts";
import type {EntityType} from "../../../entity/EntityType.ts";

export class BulletEntityRender extends CachedSpriteRenderer<number, BulletEntity> {
    private readonly bounding: Map<EntityType<any>, AABB> = new Map();

    public constructor() {
        super(new MapRenderCache(16));
    }

    protected drawSprite(ctx: CanvasRenderingContext2D, entity: BulletEntity): void {
        const r = entity.getDimensions().halfWidth;
        ctx.fillStyle = entity.color.color;

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, PI2);
        ctx.fill();

        if (entity.color.edgeHex !== 0) {
            ctx.strokeStyle = entity.color.edge;
            ctx.arc(0, 0, r + 1, 0, PI2);
        }

        ctx.stroke();
    }

    protected spriteKey(entity: BulletEntity): number {
        const type = entity.getType().hashCode();
        const color = entity.color.hex;
        const edge = entity.color.edgeHex;
        return (type * 0x9E3779B1) ^ color ^ (edge >>> 1) | 0;
    }

    protected bounds(entity: BulletEntity): AABB {
        return this.bounding.getOrInsertComputed(entity.getType(), () => {
            const r = entity.getDimensions().halfWidth + 1.5;
            return new AABB(-r, -r, r, r);
        });
    }

    public override clearCache() {
        super.clearCache();
        this.bounding.clear();
    }
}
