import {AABB} from "./AABB.ts";
import type {BlockPos} from "../../world/section/pos/BlockPos.ts";

export class MutAABB extends AABB {
    declare public minX: number;
    declare public minY: number;
    declare public maxX: number;
    declare public maxY: number;

    public set(x1: number, y1: number, x2 = x1, y2 = y1): MutAABB {
        this.minX = Math.min(x1, x2);
        this.minY = Math.min(y1, y2);
        this.maxX = Math.max(x1, x2);
        this.maxY = Math.max(y1, y2);
        return this;
    }

    public offset(x: number, y: number): MutAABB {
        this.minX += x;
        this.minY += y;
        this.maxX += x;
        this.maxY += y;
        return this;
    }

    public offsetByBlockPos(blockPos: BlockPos): MutAABB {
        this.minX += blockPos.x;
        this.minY += blockPos.y;
        this.maxX += blockPos.x;
        this.maxY += blockPos.y;
        return this;
    }

    public expand(x: number, y: number): MutAABB {
        this.minX -= x;
        this.minY -= y;
        this.maxX += x;
        this.maxY += y;
        return this;
    }
}