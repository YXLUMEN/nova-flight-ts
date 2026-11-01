import type {NbtArray} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export class NbtInt16Array implements NbtArray<number> {
    public static readonly TYPE: NbtType<NbtInt16Array> = {
        read(reader: BinaryReader): NbtInt16Array {
            const len = reader.readVarUint();
            const array = new Int16Array(len);

            for (let i = 0; i < len; i++) {
                array[i] = reader.readInt16();
            }

            return new NbtInt16Array(array);
        }
    };

    public readonly elements: Int16Array;

    public constructor(value: Int16Array) {
        this.elements = value;
    }

    public static create(list: Iterable<number>) {
        return new NbtInt16Array(new Int16Array(list));
    }

    public type(): NbtTypeId {
        return NbtTypeId.Int16Array;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.elements.length);
        for (const num of this.elements) {
            writer.writeInt16(num);
        }
    }

    public copy(): NbtInt16Array {
        const array = new Int16Array(this.elements);
        return new NbtInt16Array(array);
    }

    public toSNBT(): string {
        return `[S;${this.elements.join(',')}]`;
    }
}