import {BlockPos} from "./BlockPos.ts";
import {Direction} from "../../../utils/math/Direction.ts";
import {WorldConstants} from "../WorldConstants.ts";

export class MutBlockPos extends BlockPos {
    declare public x: number;
    declare public y: number;

    public constructor(x: number, y: number) {
        super(Math.floor(x), Math.floor(y));
        this.x = x;
        this.y = y;
    }

    public static zero(): MutBlockPos {
        return new MutBlockPos(0, 0);
    }

    public static align(x: number, y: number): MutBlockPos {
        return new MutBlockPos(x >> WorldConstants.BLOCK_SIZE_LOG2, y >> WorldConstants.BLOCK_SIZE_LOG2);
    }

    public set(x: number, y: number) {
        this.x = Math.floor(x);
        this.y = Math.floor(y);
        return this;
    }

    public setPixel(x: number, y: number) {
        this.x = x >> WorldConstants.BLOCK_SIZE_LOG2;
        this.y = y >> WorldConstants.BLOCK_SIZE_LOG2;
        return this;
    }

    public add(x: number, y: number): MutBlockPos {
        this.x += x;
        this.y += y;
        return this;
    }

    public offest(direction: Direction): BlockPos {
        this.x += direction.normal.x;
        this.y += direction.normal.y
        return this;
    }

    public toImmut(): MutBlockPos {
        return new MutBlockPos(this.x, this.y);
    }

    public static* between(a: BlockPos, b: BlockPos): Generator<BlockPos> {
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);

        const pos = new MutBlockPos(0, 0);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                yield pos.set(x, y);
            }
        }
    }
}