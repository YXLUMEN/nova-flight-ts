import type {BlockPos} from "./BlockPos.ts";
import type {Box} from "../../utils/math/Box.ts";
import type {BlockChange} from "./BlockChange.ts";
import type {NbtSerializable} from "../../nbt/NbtSerializable.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NbtUint8Array} from "../../nbt/element/NbtUint8Array.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";

export class BitBlockMap implements NbtSerializable {
    public static readonly BLOCK_SIZE = 8;
    public static readonly POWER = 3;

    private width: number;
    private height: number;
    private data: Uint8Array;

    public constructor(widthInPixels: number, heightInPixels: number) {
        this.width = Math.ceil(widthInPixels >> BitBlockMap.POWER);
        this.height = Math.ceil(heightInPixels >> BitBlockMap.POWER);

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
        this.set(pos.getX(), pos.getY(), value);
    }

    public getBlockPos(pos: BlockPos): number {
        return this.get(pos.getX(), pos.getY());
    }

    public setAt(x: number, y: number, value: number = 1): void {
        const bx = x >> BitBlockMap.POWER;
        const by = y >> BitBlockMap.POWER;
        this.set(bx, by, value);
    }

    public getAt(x: number, y: number): number {
        const bx = x >> BitBlockMap.POWER;
        const by = y >> BitBlockMap.POWER;
        return this.get(bx, by);
    }

    public isObstacleAtPixel(px: number, py: number): boolean {
        return this.getAt(px, py) !== 0;
    }

    public isInSideBlock(pos: BlockPos): boolean {
        return this.getBlockPos(pos) !== 0;
    }

    public intersectsBox(box: Box): boolean {
        const sx = Math.floor(box.minX / BitBlockMap.BLOCK_SIZE);
        const sy = Math.floor(box.minY / BitBlockMap.BLOCK_SIZE);
        const ex = Math.floor((box.maxX - 1e-5) / BitBlockMap.BLOCK_SIZE);
        const ey = Math.floor((box.maxY - 1e-5) / BitBlockMap.BLOCK_SIZE);

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
        nbt.putUint32('width', this.width);
        nbt.putUint32('height', this.height);

        const element = new NbtUint8Array(this.data);
        nbt.put('blocks', element);
        return nbt;
    }

    public readNBT(nbt: NbtCompound) {
        this.width = nbt.getUint32('width', this.width);
        this.height = nbt.getUint32('height', this.height);

        const totalBlocks = this.width * this.height;
        const byteLength = Math.ceil(totalBlocks / 8);

        if (nbt.contains('blocks', NbtTypeId.Uint8Array)) {
            const data = nbt.getUint8Array('blocks');
            if (data.byteLength === byteLength) {
                this.data = data;
            }
        }
    }
}