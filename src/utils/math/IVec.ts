import type {Vec2} from "./Vec2.ts";
import type {MutVec2} from "./MutVec2.ts";

export interface IVec {
    x: number;
    y: number;

    clone(): IVec;

    add(x: number, y: number): IVec;

    addVec(v: IVec): IVec;

    subtract(x: number, y: number): IVec;

    subVec(v: IVec): IVec;

    multiply(k: number): IVec;

    multiplyEach(a: number, b: number): IVec;

    lengthSquared(): number;

    length(): number;

    normalize(): IVec;

    equals(v: IVec, epsilon?: number): boolean;

    equalsSq(v: IVec, epsilon?: number): boolean;

    toMut(): MutVec2;

    toImmut(): Vec2;
}