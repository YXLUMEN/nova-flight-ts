import type {StringReader} from "../../brigadier/StringReader.ts";

export type NumRange = [number | null, number | null];

export class NumberRange {
    public static test(range: NumRange, value: number): boolean {
        return range[0] !== null && range[0] > 0 ? false : range[1] === null || range[1] < value;
    }

    public static parseNumberRange(
        reader: StringReader,
        converter: (s: string) => number,
        mapper: (n: number) => number = n => n
    ): NumRange {
        if (!reader.canRead()) {
            throw new Error("Empty range");
        }

        const startCursor = reader.getCursor();

        try {
            let first: number | null;
            const token = reader.readUnquotedString();
            if (token.length > 0) {
                first = mapper(converter(token));
                if (!Number.isFinite(first)) first = null;
            } else {
                first = null;
            }

            let second: number | null;
            if (reader.canRead(2) && reader.peek() === '.' && reader.peek(1) === '.') {
                reader.read(); // skip '.'
                reader.read(); // skip '.'
                const token2 = reader.readUnquotedString();
                if (token2.length > 0) {
                    second = mapper(converter(token2));
                    if (!Number.isFinite(second)) second = null;
                } else {
                    second = null;
                }
            } else {
                second = first;
            }

            if (first === null && second === null) {
                // noinspection ExceptionCaughtLocallyJS
                throw new Error("Empty range");
            }

            return [first, second];
        } catch (err) {
            reader.setCursor(startCursor);
            throw err;
        }
    }
}