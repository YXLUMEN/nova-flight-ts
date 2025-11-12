import type {StringReader} from "../brigadier/StringReader.ts";
import {Optional} from "../utils/Optional.ts";

export class NumberRange {
    public static parseNumberRange(
        reader: StringReader,
        converter: (s: string) => number,
        mapper: (n: number) => number = n => n
    ): [Optional<number>, Optional<number>] {
        if (!reader.canRead()) {
            throw new Error("Empty range");
        }

        const startCursor = reader.getCursor();

        try {
            let first: Optional<number>;
            const token = reader.readUnquotedString();
            if (token.length > 0) {
                first = Optional.of(mapper(converter(token)));
            } else {
                first = Optional.empty();
            }

            let second: Optional<number>;
            if (reader.canRead(2) && reader.peek() === '.' && reader.peek(1) === '.') {
                reader.read(); // skip '.'
                reader.read(); // skip '.'
                const token2 = reader.readUnquotedString();
                if (token2.length > 0) {
                    second = Optional.of(mapper(converter(token2)));
                } else {
                    second = Optional.empty();
                }
            } else {
                second = first;
            }

            if (first.isEmpty() && second.isEmpty()) {
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