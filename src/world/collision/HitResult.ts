import {config} from "../../utils/uit.ts";
import type {Vec2} from "../../utils/math/Vec2.ts";

export abstract class HitResult {
    public readonly pos: Vec2;

    protected constructor(pos: Vec2) {
        this.pos = pos;
    }

    public abstract getType(): HitType;
}

export const HitTypes = config({
    MISS: 0,
    BLOCK: 1,
    ENTITY: 2
});

export type HitType = typeof HitTypes[keyof typeof HitTypes];