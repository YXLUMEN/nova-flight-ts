import type {IVec} from "../../utils/math/IVec.ts";
import type {Comparable} from "../../apis/types.ts";
import type {Direction} from "../collision/Direction.ts";

/**
 * 这个类默认不保证值有效,合理使用提供的安全工具方法
 *
 * @see {@link BlockPos.align}
 * */
export class BlockPos implements Comparable {
    public static readonly BLOCK_SIZE = 8;
    public static readonly ORIGIN = new BlockPos(0, 0);

    protected x: number;
    protected y: number;

    public constructor(x: number, y: number) {
        console.assert(Number.isSafeInteger(x) && Number.isSafeInteger(y), 'BlockPos must be integer');

        this.x = x;
        this.y = y;
    }

    public static of(x: number, y: number): BlockPos {
        return new BlockPos(x, y);
    }

    public static align(x: number, y: number): BlockPos {
        return new BlockPos((x / 8) >>> 0, (y / 8) >>> 0);
    }

    public static alignValue(value: number): number {
        return (value / 8) >>> 0;
    }

    public static fromVec(vec: IVec) {
        return this.align(vec.x, vec.y);
    }

    public static max(a: BlockPos, b: BlockPos): BlockPos {
        return new BlockPos(Math.max(a.getX(), b.getX()), Math.max(a.getY(), b.getY()));
    }

    public getX(): number {
        return this.x;
    }

    public getY(): number {
        return this.y;
    }

    public add(x: number, y: number): BlockPos {
        return x === 0 && y === 0 ? this : new BlockPos(this.x + x, this.y + y);
    }

    public offest(direction: Direction): BlockPos {
        return new BlockPos(this.x + direction.dir.x, this.y + direction.dir.y);
    }

    public hashCode(): string {
        return `B[${this.x},${this.y}]`;
    }

    public equals(other: Comparable): boolean {
        if (other === this) return true;
        if (!(other instanceof BlockPos)) {
            return false;
        }
        return other.x === this.x && other.y === this.y;
    }
}