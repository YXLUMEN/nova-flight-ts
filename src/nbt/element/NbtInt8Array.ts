import type {NbtArray} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";

export class NbtInt8Array implements NbtArray<number> {
    public static readonly TYPE: NbtType<NbtInt8Array> = {
        read(reader: BinaryReader): NbtInt8Array {
            const len = reader.readVarUint();
            const bytes = new Int8Array(len);

            for (let i = 0; i < len; i++) {
                bytes[i] = reader.readInt8();
            }

            return new NbtInt8Array(bytes);
        }
    };

    public readonly elements: Int8Array;

    public constructor(value: Int8Array) {
        this.elements = value;
    }

    public static create(list: Iterable<number>) {
        return new NbtInt8Array(new Int8Array(list));
    }

    public type(): NbtTypeId {
        return NbtTypeId.Int8Array;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.elements.length);
        for (const num of this.elements) {
            writer.writeInt8(num);
        }
    }

    public copy(): NbtInt8Array {
        return new NbtInt8Array(new Int8Array(this.elements));
    }

    public toSNBT(): string {
        return `[b;${this.elements.join(',')}]`;
    }
}