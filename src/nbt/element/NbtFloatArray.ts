import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export class NbtFloatArray implements NbtElement {
    public static readonly TYPE: NbtType<NbtFloatArray> = {
        read(reader: BinaryReader): NbtFloatArray {
            const len = reader.readVarUint();
            const array = new Float32Array(len);

            for (let i = 0; i < len; i++) {
                const value = reader.readFloat();
                if (!Number.isFinite(value)) throw new IllegalArgumentError('Float must be finite');
                array[i] = value;
            }

            return new NbtFloatArray(array);
        }
    };

    public readonly value: Float32Array;

    public constructor(value: Float32Array) {
        this.value = value;
    }

    public static create(list: Iterable<number>) {
        return new NbtFloatArray(new Float32Array(list));
    }

    public type(): NbtTypeId {
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