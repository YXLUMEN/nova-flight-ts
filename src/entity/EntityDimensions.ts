import {Box} from "../utils/math/Box.ts";
import type {IVec} from "../utils/math/IVec.ts";

export class EntityDimensions {
    public readonly width: number;
    public readonly height: number;

    private constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public static changing(width: number, height: number) {
        return new EntityDimensions(width, height);
    }

    public getBoxAt(x: number, y: number): Box {
        const f = this.width / 2.0;
        const g = this.height;
        return new Box(x - f, y, x + f, y + g);
    }

    public getBoxAtByVec(pos: IVec) {
        return this.getBoxAt(pos.x, pos.y);
    }
}