import type {Comparable} from "../../apis/types.ts";

export class StringRange implements Comparable {
    private readonly start: number;
    private readonly end: number;

    public constructor(start: number, end: number) {
        this.start = start;
        this.end = end;
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

    public equals(o: object): boolean {
        if (this === o) return true;

        if (o instanceof StringRange) {
            return this.start === o.start && this.end === o.end;
        }

        return false;
    }

    public hashCode(): string {
        return `StringRange(${this.getStart()}${this.getEnd()}${this.getLength()})`;
    }
}