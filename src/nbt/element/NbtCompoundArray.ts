import type {NbtArray} from "./NbtElement.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";
import {NbtCompound} from "./NbtCompound.ts";

export class NbtCompoundArray implements NbtArray<NbtCompound> {
    public static readonly TYPE: NbtType<NbtCompoundArray> = {
        read(reader: BinaryReader): NbtCompoundArray {
            const len = reader.readVarUint();
            const array: NbtCompound[] = new Array(len).fill(null);

            for (let i = 0; i < len; i++) {
                array[i] = NbtCompound.TYPE.read(reader);
            }

            return new NbtCompoundArray(array);
        }
    };

    public readonly elements: NbtCompound[];

    public constructor(value: NbtCompound[]) {
        this.elements = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.CompoundArray;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.elements.length);
        for (const compound of this.elements) {
            compound.write(writer);
        }
    }

    public copy(): NbtCompoundArray {
        const array = this.elements.map(compound => compound.copy());
        return new NbtCompoundArray(array);
    }

    public toSNBT(): string {
        const listItems = this.elements
            .map(comp => comp.toSNBT())
            .join(',');
        return `[${listItems}]`;
    }
}
