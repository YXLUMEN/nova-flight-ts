import {BlockPos} from "./BlockPos.ts";

export class MutBlockPos extends BlockPos {
    public static align(x: number, y: number): MutBlockPos {
        return new MutBlockPos((x / 8) >>> 0, (y / 8) >>> 0);
    }

    public set(x: number, y: number) {
        console.assert(Number.isSafeInteger(x) && Number.isSafeInteger(y), 'BlockPos must be integer');
        this.x = x;
        this.y = y;
        return this;
    }

    public setPixel(x: number, y: number) {
        this.x = x >> 3;
        this.y = y >> 3;
        return this;
    }
}