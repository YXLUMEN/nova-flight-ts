import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export class NbtDouble implements NbtElement {
    public static readonly TYPE: NbtType<NbtDouble> = {
        read(reader: BinaryReader) {
            const value = reader.readDouble();
            if (!Number.isFinite(value)) throw new IllegalArgumentError('Double must be finite');
            return NbtDouble.of(value);
        }
    };
    public static readonly ZERO = new NbtDouble(0);

    public static of(value: number): NbtDouble {
        return value === 0.0 ? this.ZERO : new NbtDouble(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.Double;
    }

    public write(writer: BinaryWriter): void {
        writer.writeDouble(this.value);
    }

    public copy(): NbtDouble {
        return this;
    }

    public toString(): string {
        return `${this.value}d`;
    }
}