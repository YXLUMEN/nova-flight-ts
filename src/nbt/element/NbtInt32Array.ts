import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtInt32Array implements NbtElement {
    public static readonly TYPE: NbtType<NbtInt32Array> = {
        read(reader: BinaryReader): NbtInt32Array {
            const len = reader.readVarUint();
            const array = new Int32Array(len);

            for (let i = 0; i < len; i++) {
                array[i] = reader.readInt32();
            }

            return new NbtInt32Array(array);
        }
    };

    public readonly value: Int32Array;

    public constructor(value: Int32Array) {
        this.value = value;
    }

    public static create(list: number[]) {
        return new NbtInt32Array(new Int32Array(list));
    }

    public getType(): NbtTypeId {
        return NbtTypeId.Int32Array;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.value.length);
        for (const num of this.value) {
            writer.writeInt32(num);
        }
    }

    public copy(): NbtInt32Array {
        return new NbtInt32Array(new Int32Array(this.value));
    }

    public toString(): string {
        return `[I;${this.value.join(',')}]`;
    }
}