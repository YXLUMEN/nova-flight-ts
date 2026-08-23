import {AABB} from "../utils/math/AABB.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export class EntityDimensions {
    public readonly width: number;
    public readonly height: number;
    public readonly fixed: boolean;

    public readonly halfWidth: number;
    public readonly halfHeight: number;

    private constructor(width: number, height: number, fixed: boolean) {
        this.width = width;
        this.height = height;
        this.fixed = fixed;

        this.halfWidth = width / 2;
        this.halfHeight = height / 2;
    }

    public static scalable(width: number, height: number): EntityDimensions {
        return new EntityDimensions(width, height, true);
    }

    public static fixed(width: number, height: number): EntityDimensions {
        return new EntityDimensions(width, height, false);
    }

    public getBoxAt(x: number, y: number): AABB {
        return new AABB(x - this.halfWidth, y - this.halfHeight, x + this.halfWidth, y + this.halfHeight);
    }

    public getBoxAtByVec(pos: Vec2): AABB {
        return this.getBoxAt(pos.x, pos.y);
    }

    public scale(factorX: number, factorY?: number): EntityDimensions {
        return this.fixed || (factorX === 1 && factorY === 1) ?
            this :
            new EntityDimensions(this.width * factorX, this.height * (factorY ?? factorX), false);
    }
}