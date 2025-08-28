export interface IVec {
    x: number;
    y: number;

    clone(): IVec;

    add(x: number, y: number): IVec;

    addVec(v: IVec): IVec;

    sub(x: number, y: number): IVec;

    subVec(v: IVec): IVec

    mul(k: number): IVec

    lengthSq(): number

    length(): number

    normalize(): IVec

    equals(v: IVec, epsilon: number): boolean

    equalsSq(v: IVec, epsilon: number): boolean
}