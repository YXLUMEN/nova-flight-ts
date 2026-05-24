import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtUint32Array implements NbtElement {
    public static readonly TYPE: NbtType<NbtUint32Array> = {
        read(reader: BinaryReader): NbtUint32Array {
            const len = reader.readVarUint();
            const array = new Uint32Array(len);

            for (let i = 0; i < len; i++) {
                array[i] = reader.readUint32();
            }

            return new NbtUint32Array(array);
        }
    };

    public readonly value: Uint32Array;

    public constructor(value: Uint32Array) {
        this.value = value;
    }

    public static create(list: number[]) {
        return new NbtUint32Array(new Uint32Array(list));
    }

    public getType(): NbtTypeId {
        return NbtTypeId.Uint32Array;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.value.length);
        for (const num of this.value) {
            writer.writeUint32(num);
        }
    }

    public copy(): NbtUint32Array {
        return new NbtUint32Array(new Uint32Array(this.value));
    }

    public toString() {
        return `[U;${this.value.join(",")}]`;
    }
}