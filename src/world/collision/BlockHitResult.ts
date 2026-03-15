import type {BlockPos} from "../map/BlockPos.ts";
import type {IVec} from "../../utils/math/IVec.ts";
import type {Direction} from "./Direction.ts";
import {HitResult, type HitType} from "./HitResult.ts";

export class BlockHitResult extends HitResult {
    public readonly direction: Direction;
    public readonly blockPos: BlockPos;
    public readonly missed: boolean;
    public readonly insideBlock: boolean;

    public static missed(pos: IVec, direction: Direction, blockPos: BlockPos) {
        return new BlockHitResult(pos, direction, blockPos, false, true);
    }

    public constructor(pos: IVec, direction: Direction, blockPos: BlockPos, insideBlock: boolean, missed: boolean = false) {
        super(pos);
        this.direction = direction;
        this.blockPos = blockPos;
        this.missed = missed;
        this.insideBlock = insideBlock;
    }

    public getType(): HitType {
        return this.missed ? 0 : 1;
    }
}