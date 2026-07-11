import type {Direction} from "../../../utils/math/Direction.ts";
import type {Comparable} from "../../../type/Comparable.ts";
import {Vec2} from "../../../utils/math/Vec2.ts";

export class BlockPos extends Vec2 {
    public static readonly BLOCK_SIZE = 8;
    public static readonly ORIGIN = new BlockPos(0, 0);

    public constructor(x: number, y: number) {
        super(Math.floor(x), Math.floor(y));
    }

    // 注意,将使用原始数据
    public static of(x: number, y: number): BlockPos {
        return new BlockPos(x, y);
    }

    public static fromVec(vec: Vec2) {
        return this.align(vec.x, vec.y);
    }

    public static align(x: number, y: number): BlockPos {
        return new BlockPos(x / 8, y / 8);
    }

    public static alignValue(value: number): number {
        return Math.floor(value / 8);
    }

    public static max(a: BlockPos, b: BlockPos): BlockPos {
        return new BlockPos(Math.max(a.x, b.x), Math.max(a.y, b.y));
    }

    public add(x: number, y: number): BlockPos {
        return x === 0 && y === 0 ? this : new BlockPos(this.x + x, this.y + y);
    }

    public offest(direction: Direction): BlockPos {
        return new BlockPos(this.x + direction.normal.x, this.y + direction.normal.y);
    }

    public toString(): string {
        return `B[${this.x},${this.y}]`;
    }

    public equal(other: Comparable): boolean {
        if (other === this) return true;
        if (!(other instanceof BlockPos)) {
            return false;
        }
        return other.x === this.x && other.y === this.y;
    }
}