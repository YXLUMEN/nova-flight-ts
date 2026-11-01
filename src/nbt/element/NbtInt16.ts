import type {NbtNumber} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtInt16 implements NbtNumber {
    public static readonly TYPE: NbtType<NbtInt16> = {
        read(reader: BinaryReader) {
            return NbtInt16.of(reader.readInt16());
        }
    };

    public static of(value: number): NbtInt16 {
        value = Math.floor(value);
        return new NbtInt16(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.Int16;
    }

    public write(writer: BinaryWriter): void {
        writer.writeInt16(this.value);
    }

    public copy(): NbtInt16 {
        return this;
    }

    public toSNBT(): string {
        return `${this.value}s`;
    }
}