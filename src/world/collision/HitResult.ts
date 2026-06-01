import type {Vec2} from "../../utils/math/Vec2.ts";

export abstract class HitResult {
    public readonly pos: Vec2;

    protected constructor(pos: Vec2) {
        this.pos = pos;
    }

    public abstract getType(): HitType;
}

export const enum HitType {
    MISS,
    BLOCK,
    ENTITY
}
