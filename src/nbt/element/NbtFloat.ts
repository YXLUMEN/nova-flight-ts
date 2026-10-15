import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export class NbtFloat implements NbtElement {
    public static readonly TYPE: NbtType<NbtFloat> = {
        read(reader: BinaryReader) {
            const value = reader.readFloat();
            if (!Number.isFinite(value)) throw new IllegalArgumentError('Float must be finite');
            return NbtFloat.of(value);
        }
    };
    public static readonly ZERO = new NbtFloat(0);

    public static of(value: number): NbtFloat {
        return value === 0.0 ? this.ZERO : new NbtFloat(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.Float;
    }

    public write(writer: BinaryWriter): void {
        writer.writeFloat(this.value);
    }

    public copy(): NbtFloat {
        return this;
    }

    public toString(): string {
        return `${this.value}f`;
    }
}