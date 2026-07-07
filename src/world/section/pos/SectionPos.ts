import {Vec2} from "../../../utils/math/Vec2.ts";
import {BlockPos} from "./BlockPos.ts";
import {WorldConstants} from "../WorldConstants.ts";

export class SectionPos extends Vec2 {
    public static readonly ZERO = Object.freeze(new SectionPos(0, 0)) as SectionPos;

    public constructor(x: number, y: number) {
        super(Math.floor(x), Math.floor(y));
    }

    public static blockToSection(blockCoord: number) {
        return blockCoord >> WorldConstants.SECTION_SIZE_LOG2;
    }

    public static sectionToBlock(sectionCoord: number) {
        return sectionCoord << WorldConstants.SECTION_SIZE_LOG2;
    }

    public static sectionRelative(blockCoord: number) {
        return blockCoord & WorldConstants.SECTION_MASK;
    }

    public static sectionRelativePos(pos: BlockPos) {
        const x = this.sectionRelative(pos.x);
        const y = this.sectionRelative(pos.y);
        return (y << WorldConstants.SECTION_SIZE_LOG2) | x;
    }

    public static fromBlock(blockX: number, blockY: number): SectionPos {
        return new SectionPos(
            this.blockToSection(blockX),
            this.blockToSection(blockY)
        );
    }

    public static fromBlockPos(pos: BlockPos): SectionPos {
        return this.fromBlock(pos.x, pos.y);
    }

    public static pack(x: number, y: number): number {
        return (x << 16) | (y & 0xFFFF);
    }

    public static unpackX(coord: number): number {
        return coord >> 16;
    }

    public static unpackY(coord: number): number {
        return (coord << 16) >> 16;
    }

    public origin(): BlockPos {
        return new BlockPos(SectionPos.sectionToBlock(this.x), SectionPos.sectionToBlock(this.y));
    }

    public pack(): number {
        return SectionPos.pack(this.x, this.y);
    }

    public toString(): string {
        return `S[${this.x},${this.y}]`;
    }
}