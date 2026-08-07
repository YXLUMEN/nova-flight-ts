import type {BlockPos} from "./pos/BlockPos.ts";
import type {AABB} from "../../utils/math/AABB.ts";
import type {BlockChange} from "./BlockChange.ts";
import type {NbtSerializable} from "../../nbt/NbtSerializable.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NbtUint8Array} from "../../nbt/element/NbtUint8Array.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {WorldConstants} from "./WorldConstants.ts";

export class BitBlockMap implements NbtSerializable {
    private widthPx: number;
    private heightPx: number;
    private width: number;
    private height: number;
    private data: Uint8Array;

    public constructor(widthInPixels: number, heightInPixels: number) {
        this.widthPx = Math.floor(widthInPixels);
        this.heightPx = Math.floor(heightInPixels);

        this.width = Math.ceil(this.widthPx >> WorldConstants.BLOCK_SIZE_LOG2);
        this.height = Math.ceil(this.heightPx >> WorldConstants.BLOCK_SIZE_LOG2);

        const totalBlocks = this.width * this.height;
        const byteLength = Math.ceil(totalBlocks / 8);
        this.data = new Uint8Array(byteLength);
    }

    private blockIndex(bx: number, by: number): number {
        return by * this.width + bx;
    }

    private getBit(index: number): number {
        const byteIdx = index >>> 3; // index / 8
        const bitIdx = index & 7;    // index % 8
        if (byteIdx >= this.data.length) return 0;
        return (this.data[byteIdx] >>> bitIdx) & 1;
    }

    private setBit(index: number, value: number): void {
        const byteIdx = index >>> 3;
        const bitIdx = index & 7;
        if (byteIdx >= this.data.length) return;
        if (value) {
            this.data[byteIdx] |= (1 << bitIdx);
        } else {
            this.data[byteIdx] &= ~(1 << bitIdx);
        }
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public getWidthPx(): number {
        return this.widthPx;
    }

    public getHeightPx(): number {
        return this.heightPx;
    }

    public set(bx: number, by: number, value: number = 1): void {
        console.assert(Number.isSafeInteger(bx) && Number.isSafeInteger(by),
            'Block pos must be an integer');
        if (bx >= 0 && bx < this.width && by >= 0 && by < this.height) {
            this.setBit(this.blockIndex(bx, by), value ? 1 : 0);
        }
    }

    public get(bx: number, by: number): number {
        console.assert(Number.isSafeInteger(bx) && Number.isSafeInteger(by),
            'Block pos must be an integer');
        if (bx < 0 || bx >= this.width || by < 0 || by >= this.height) {
            return 0;
        }
        return this.getBit(this.blockIndex(bx, by));
    }

    public setBlock(pos: BlockPos, value: number = 1): void {
        this.set(pos.x, pos.y, value);
    }

    public getBlockPos(pos: BlockPos): number {
        return this.get(pos.x, pos.y);
    }

    public setAt(x: number, y: number, value: number = 1): void {
        const bx = x >> WorldConstants.BLOCK_SIZE_LOG2;
        const by = y >> WorldConstants.BLOCK_SIZE_LOG2;
        this.set(bx, by, value);
    }

    public getAt(x: number, y: number): number {
        const bx = x >> WorldConstants.BLOCK_SIZE_LOG2;
        const by = y >> WorldConstants.BLOCK_SIZE_LOG2;
        return this.get(bx, by);
    }

    public isObstacleAtPixel(px: number, py: number): boolean {
        return this.getAt(px, py) !== 0;
    }

    public isInSideBlock(pos: BlockPos): boolean {
        return this.getBlockPos(pos) !== 0;
    }

    public intersectsBox(box: AABB): boolean {
        const sx = Math.floor(box.minX / WorldConstants.BLOCK_SIZE);
        const sy = Math.floor(box.minY / WorldConstants.BLOCK_SIZE);
        const ex = Math.floor((box.maxX - 1e-5) / WorldConstants.BLOCK_SIZE);
        const ey = Math.floor((box.maxY - 1e-5) / WorldConstants.BLOCK_SIZE);

        for (let by = sy; by <= ey; by++) {
            for (let bx = sx; bx <= ex; bx++) {
                if (this.get(bx, by) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    public* getNonAirBlocksGen(): Generator<BlockChange> {
        const total = this.width * this.height;
        for (let i = 0; i < total; i++) {
            if (this.getBit(i) !== 0) {
                const bx = i % this.width;
                const by = (i / this.width) >>> 0;
                yield {x: bx, y: by, type: 1};
            }
        }
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.setUint32('width_px', this.widthPx);
        nbt.setUint32('height_px', this.heightPx);
        nbt.setUint32('width', this.width);
        nbt.setUint32('height', this.height);

        if (this.data.every(v => v === 0)) return nbt;

        const element = new NbtUint8Array(this.data);
        nbt.set('blocks', element);
        return nbt;
    }

    public readNBT(nbt: NbtCompound) {
        this.widthPx = nbt.getUint32('width_px', this.widthPx);
        this.heightPx = nbt.getUint32('height_px', this.heightPx);
        this.width = nbt.getUint32('width', this.width);
        this.height = nbt.getUint32('height', this.height);

        if (!nbt.contains('blocks', NbtTypeId.Uint8Array)) return;

        const totalBlocks = this.width * this.height;
        const byteLength = Math.ceil(totalBlocks / 8);

        const data = nbt.getUint8Array('blocks');
        if (data.byteLength === byteLength) {
            this.data = data;
        }
    }
}