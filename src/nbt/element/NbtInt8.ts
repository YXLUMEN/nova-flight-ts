import type {NbtElement} from "./NbtElement.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export class NbtInt8 implements NbtElement {
    public static readonly TYPE: NbtType<NbtInt8> = {
        read(reader: BinaryReader) {
            return NbtInt8.of(reader.readInt8());
        }
    };

    public static of(value: number): NbtInt8 {
        return this.cache[128 + Math.floor(value)];
    }

    public static bool(bl: boolean): NbtInt8 {
        return bl ? this.cache[129] : this.cache[128];
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.Int8;
    }

    public write(writer: BinaryWriter): void {
        writer.writeInt8(this.value);
    }

    public copy(): NbtInt8 {
        return this;
    }

    private static readonly cache: NbtInt8[] = Array.from(
        {length: 256},
        (_, i) => new NbtInt8(i - 128)
    );

    public toString(): string {
        return `${this.value}b`;
    }
}