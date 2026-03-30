import type {AABB} from "../../utils/math/AABB.ts";
import type {BlockPos} from "./BlockPos.ts";
import type {NbtSerializable} from "../../nbt/NbtSerializable.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NbtTypeId} from "../../nbt/NbtType.ts";
import {NbtUint8Array} from "../../nbt/element/NbtUint8Array.ts";

export class BlockMap implements NbtSerializable {
    public static readonly BLOCK_SIZE = 8;
    public static readonly POWER = 3;

    private width: number;
    private height: number;
    private blocks: Uint8Array<ArrayBuffer>;

    public constructor(widthInPixels: number, heightInPixels: number) {
        this.width = Math.ceil(widthInPixels / 8);
        this.height = Math.ceil(heightInPixels / 8);
        this.blocks = new Uint8Array(this.width * this.height);
    }

    private index(x: number, y: number) {
        return y * this.width + x;
    }

    public set(bx: number, by: number, value: number = 1): void {
        console.assert(Number.isSafeInteger(bx) && Number.isSafeInteger(by), 'Raw pos must be an integer');

        if (bx >= 0 && bx < this.width && by >= 0 && by < this.width) {
            this.blocks[this.index(bx, by)] = value;
        }
    }

    public get(bx: number, by: number): number {
        console.assert(Number.isSafeInteger(bx) && Number.isSafeInteger(by), 'Raw pos must be an integer');

        if (bx < 0 || bx >= this.width || by < 0 || by >= this.height) {
            return 0;
        }
        return this.blocks[this.index(bx, by)];
    }

    public setBlock(pos: BlockPos, value: number = 1): void {
        this.set(pos.getX(), pos.getY(), value);
    }

    public getBlockPos(pos: BlockPos): number {
        return this.get(pos.getX(), pos.getY());
    }

    public setAt(x: number, y: number, value: number = 1): void {
        const bx = x >> BlockMap.POWER;
        const by = y >> BlockMap.POWER;
        this.set(bx, by, value);
    }

    public getAt(x: number, y: number): number {
        const bx = x >> BlockMap.POWER;
        const by = y >> BlockMap.POWER;
        return this.get(bx, by);
    }

    public isObstacleAtPixel(px: number, py: number): boolean {
        const bx = px >> BlockMap.POWER;
        const by = py >> BlockMap.POWER;
        return this.get(bx, by) !== 0;
    }

    public isInSideBlock(pos: BlockPos): boolean {
        return this.get(pos.getX(), pos.getY()) !== 0;
    }

    public intersectsBox(box: AABB): boolean {
        const startTileX = box.minX >> BlockMap.POWER;
        const startTileY = box.minY >> BlockMap.POWER;
        const endTileX = (box.maxX - 1E-5) >> BlockMap.POWER;
        const endTileY = (box.maxY - 1E-5) >> BlockMap.POWER;

        for (let by = startTileY; by <= endTileY; by++) {
            for (let bx = startTileX; bx <= endTileX; bx++) {
                if (this.get(bx, by) !== 0) {
                    return true;
                }
            }
        }
        return false;
    }

    public writeNBT(nbt: NbtCompound): NbtCompound {
        nbt.putUint32('width', this.width);
        nbt.putUint32('height', this.height);

        const element = new NbtUint8Array(this.blocks);
        nbt.put('blocks', element);
        return nbt;
    }

    public readNBT(nbt: NbtCompound) {
        this.width = nbt.getUint32('width', this.width);
        this.height = nbt.getUint32('height', this.height);

        if (nbt.contains('block_map', NbtTypeId.Uint8Array)) {
            this.blocks = nbt.getUint8Array('block_map') as Uint8Array<ArrayBuffer>;
        }
    }
}