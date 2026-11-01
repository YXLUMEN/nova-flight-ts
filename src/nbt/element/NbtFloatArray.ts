import type {NbtArray} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import {IllegalArgumentError} from "../../type/errors.ts";

export class NbtFloatArray implements NbtArray<number> {
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

    public readonly elements: Float32Array;

    public constructor(value: Float32Array) {
        this.elements = value;
    }

    public static create(list: Iterable<number>) {
        return new NbtFloatArray(new Float32Array(list));
    }

    public type(): NbtTypeId {
        return NbtTypeId.FloatArray;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.elements.length);
        for (const num of this.elements) {
            writer.writeFloat(num);
        }
    }

    public copy(): NbtFloatArray {
        const array = new Float32Array(this.elements);
        return new NbtFloatArray(array);
    }

    public toSNBT(): string {
        return `[F;${this.elements.join(',')}]`;
    }
}