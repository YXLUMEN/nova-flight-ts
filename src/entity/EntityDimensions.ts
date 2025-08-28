import {Box} from "../utils/math/Box.ts";
import type {Vec2} from "../utils/math/Vec2.ts";

export class EntityDimensions {
    public width: number;
    public height: number;

    private constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public getBoxAt(x: number, y: number): Box {
        const f = this.width / 2.0;
        const g = this.height;
        return new Box(x - f, y, x + f, y + g);
    }

    public getBoxAtByVec(pos: Vec2) {
        return this.getBoxAt(pos.x, pos.y);
    }

    public static changing(width: number, height: number) {
        return new EntityDimensions(width, height);
    }
}