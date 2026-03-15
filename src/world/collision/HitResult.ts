import type {IVec} from "../../utils/math/IVec.ts";
import {config} from "../../utils/uit.ts";

export abstract class HitResult {
    public readonly pos: IVec;

    protected constructor(pos: IVec) {
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