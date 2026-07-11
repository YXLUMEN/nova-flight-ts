import type {Comparable} from "../../type/Comparable.ts";

export class StringRange implements Comparable {
    private readonly start: number;
    private readonly end: number;

    public constructor(start: number, end: number) {
        this.start = Math.floor(start);
        this.end = Math.floor(end);
    }

    public static at(pos: number) {
        return new StringRange(pos, pos);
    }

    public static between(start: number, end: number) {
        return new StringRange(start, end);
    }

    public static encompassing(a: StringRange, b: StringRange) {
        return new StringRange(Math.min(a.start, b.start), Math.max(a.end, b.end));
    }

    public getStart(): number {
        return this.start;
    }

    public getEnd(): number {
        return this.end;
    }

    public isEmpty() {
        return this.start === this.end;
    }

    public getLength() {
        return this.end - this.start;
    }

    public equal(o: unknown): boolean {
        if (this === o) return true;

        if (o instanceof StringRange) {
            return this.start === o.start && this.end === o.end;
        }

        return false;
    }

    public hashCode(): number {
        return (this.start * 31 + this.end) | 0;
    }

    public toString(): string {
        return `StringRange(${this.getStart()}${this.getEnd()}${this.getLength()})`;
    }
}