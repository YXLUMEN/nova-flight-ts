import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtFloatArray implements NbtElement {
    public static readonly TYPE: NbtType<NbtFloatArray> = {
        read(reader: BinaryReader): NbtFloatArray {
            const len = reader.readVarUint();
            const array = new Float32Array(len);

            for (let i = 0; i < len; i++) {
                array[i] = reader.readFloat();
            }

            return new NbtFloatArray(array);
        }
    };

    public readonly value: Float32Array;

    public constructor(value: Float32Array) {
        this.value = value;
    }

    public static create(list: number[]) {
        return new NbtFloatArray(new Float32Array(list));
    }

    public getType(): NbtTypeId {
        return NbtTypeId.FloatArray;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.value.length);
        for (const num of this.value) {
            writer.writeFloat(num);
        }
    }

    public copy(): NbtFloatArray {
        const array = new Float32Array(this.value);
        return new NbtFloatArray(array);
    }

    public toString(): string {
        return `[F;${this.value.join(',')}]`;
    }
}