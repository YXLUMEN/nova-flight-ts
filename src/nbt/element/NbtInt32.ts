import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtInt32 implements NbtElement {
    public static readonly TYPE: NbtType<NbtInt32> = {
        read(reader: BinaryReader) {
            return NbtInt32.of(reader.readInt32());
        }
    };

    public static of(value: number): NbtInt32 {
        value = Math.floor(value);
        return new NbtInt32(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public getType(): NbtTypeId {
        return NbtTypeId.Int32;
    }

    public write(writer: BinaryWriter): void {
        writer.writeInt32(this.value);
    }

    public copy(): NbtInt32 {
        return this;
    }

    public toString(): string {
        return `${this.value}i`;
    }
}