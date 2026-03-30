import {AABB} from "../utils/math/AABB.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class EntityDimensions {
    public readonly width: number;
    public readonly height: number;

    public readonly halfWidth: number;
    public readonly halfHeight: number;

    private constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;
    }

    public static changing(width: number, height: number) {
        return new EntityDimensions(width, height);
    }

    public getBoxAt(x: number, y: number): AABB {
        return new AABB(x - this.halfWidth, y - this.halfHeight, x + this.halfWidth, y + this.halfHeight);
    }

    public getBoxAtByVec(pos: IVec) {
        return this.getBoxAt(pos.x, pos.y);
    }
}