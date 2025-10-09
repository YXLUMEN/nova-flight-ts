import {MutVec2} from "../utils/math/MutVec2.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {Vec2} from "../utils/math/Vec2.ts";

export class TrackedPosition {
    private pos = MutVec2.zero();

    public withDelta(dx: number, dy: number): Vec2 {
        if (dx === 0 && dy === 0) {
            return this.pos.toImmutable();
        }

        const x = dx === 0 ? this.pos.x : dequantize(quantize(this.pos.x) + dx);
        const y = dy === 0 ? this.pos.y : dequantize(quantize(this.pos.y) + dy);
        return new Vec2(x, y);
    }

    public getDeltaX(pos: IVec): number {
        return quantize(pos.x) - quantize(this.pos.x);
    }

    public getDeltaY(pos: IVec): number {
        return quantize(pos.y) - quantize(this.pos.y);
    }

    public subtract(pos: IVec): IVec {
        return pos.subVec(this.pos);
    }

    public setPos(x: number, y: number): void {
        this.pos.set(x, y);
    }

    public getPos(): Readonly<MutVec2> {
        return this.pos;
    }
}

function quantize(value: number) {
    return Math.round(value * 4096);
}

function dequantize(value: number) {
    return value / 4096;
}