import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtUint32 implements NbtElement {
    public static readonly TYPE: NbtType<NbtUint32> = {
        read(reader: BinaryReader) {
            return NbtUint32.of(reader.readUint32());
        }
    };

    public static of(value: number): NbtUint32 {
        value = value >>> 0;
        return new NbtUint32(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value;
    }

    public getType(): NbtTypeId {
        return NbtTypeId.Uint32;
    }

    public write(writer: BinaryWriter): void {
        writer.writeUint32(this.value);
    }

    public copy(): NbtUint32 {
        return this;
    }

    public toString(): string {
        return `${this.value}u`;
    }
}