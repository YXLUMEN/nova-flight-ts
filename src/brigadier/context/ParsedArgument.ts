import {StringRange} from "../StringRange.ts";

// @ts-ignore
export class ParsedArgument<S, T> {
    public readonly range: StringRange;
    public readonly result: T;

    public constructor(start: number, end: number, result: T) {
        this.range = StringRange.between(start, end);
        this.result = result;
    }
}