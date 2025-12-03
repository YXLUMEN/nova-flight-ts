import type {StringReader} from "../../brigadier/StringReader.ts";
import {IllegalArgumentError} from "../../apis/errors.ts";

export class CoordinateArgument {
    private readonly relative: boolean;
    private readonly value: number;

    public constructor(relative: boolean, value: number) {
        this.relative = relative;
        this.value = value;
    }

    public toAbsoluteCoordinate(offset: number) {
        return this.relative ? this.value + offset : this.value;
    }

    public static parseCenter(reader: StringReader, centerIntegers: boolean): CoordinateArgument {
        if (reader.canRead() && reader.peek() === '^') {
            throw new IllegalArgumentError('Can not mix coordinate');
        }
        if (!reader.canRead()) {
            throw new IllegalArgumentError('Missing coordinate');
        }

        const isRelative = CoordinateArgument.isRelative(reader);
        const start = reader.getCursor();

        let value = reader.canRead() && reader.peek() !== ' ' ? reader.readDouble() : 0;
        const str = reader.getString().substring(start, reader.getCursor());

        if (isRelative && str.length === 0) {
            return new CoordinateArgument(true, 0);
        }
        if (!str.includes('.') && !isRelative && centerIntegers) {
            value += 0.5;
        }
        return new CoordinateArgument(isRelative, value);
    }

    public static parse(reader: StringReader): CoordinateArgument {
        if (reader.canRead() && reader.peek() === '^') {
            throw new IllegalArgumentError('Can not mix coordinate');
        }
        if (!reader.canRead()) {
            throw new IllegalArgumentError('Missing coordinate');
        }

        const isRelative = CoordinateArgument.isRelative(reader);
        let value: number;
        if (reader.canRead() && reader.peek() !== ' ') {
            value = isRelative ? reader.readDouble() : reader.readInt();
        } else {
            value = 0;
        }

        return new CoordinateArgument(isRelative, value);
    }

    public static isRelative(reader: StringReader): boolean {
        if (reader.peek() === '~') {
            reader.skip();
            return true;
        }
        return false;
    }

    public isRelative() {
        return this.relative;
    }
}