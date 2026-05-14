import {MutVec2} from "../utils/math/MutVec2.ts";
import {Vec2} from "../utils/math/Vec2.ts";

export class VecDeltaCodec {
    private base = MutVec2.zero();

    public withDelta(dx: number, dy: number): Vec2 {
        if (dx === 0 && dy === 0) {
            return this.base.toImmut();
        }

        const x = dx === 0 ? this.base.x : dequantize(quantize(this.base.x) + dx);
        const y = dy === 0 ? this.base.y : dequantize(quantize(this.base.y) + dy);
        return new Vec2(x, y);
    }

    public encodeX(pos: Vec2): number {
        return quantize(pos.x) - quantize(this.base.x);
    }

    public encodeY(pos: Vec2): number {
        return quantize(pos.y) - quantize(this.base.y);
    }

    public delta(pos: Vec2): Vec2 {
        return pos.subVec(this.base);
    }

    public setBase(x: number, y: number): void {
        this.base.set(x, y);
    }

    public getBase(): Readonly<MutVec2> {
        return this.base;
    }
}

function quantize(value: number) {
    return Math.round(value * 4096);
}

function dequantize(value: number) {
    return value / 4096;
}