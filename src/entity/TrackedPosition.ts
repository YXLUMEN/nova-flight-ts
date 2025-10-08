import {MutVec2} from "../utils/math/MutVec2.ts";
import type {IVec} from "../utils/math/IVec.ts";
import {Vec2} from "../utils/math/Vec2.ts";

export class TrackedPosition {
    private pos = MutVec2.zero();

    public withDelta(dx: number, dy: number): Vec2 {
        if (dx === 0 && dy === 0) {
            return this.pos.toImmutable();
        }

        const x = dx === 0 ? this.pos.x : unpack(pack(this.pos.x) + dx);
        const y = dy === 0 ? this.pos.y : unpack(pack(this.pos.y) + dy);
        return new Vec2(x, y);
    }

    public getDeltaX(pos: IVec): number {
        return pack(pos.x) - pack(this.pos.x);
    }

    public getDeltaY(pos: IVec): number {
        return pack(pos.y) - pack(this.pos.y);
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

function pack(value: number) {
    return Math.round(value * 4096);
}

function unpack(value: number) {
    return value / 4096;
}