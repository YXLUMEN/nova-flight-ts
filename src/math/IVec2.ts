export interface IVec2 {
    x: number;
    y: number;

    clone(): IVec2;

    sub(vec2: IVec2): IVec2;

    mul(k: number): IVec2;

    scale(s: number): IVec2;

    lengthSq(): number;

    length(): number;

    normalize(): IVec2;
}