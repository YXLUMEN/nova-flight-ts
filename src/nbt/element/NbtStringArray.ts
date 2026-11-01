import {type NbtType, NbtTypeId} from "../NbtType.ts";
import type {NbtArray} from "./NbtElement.ts";
import type {BinaryReader} from "../../serialization/BinaryReader.ts";
import type {BinaryWriter} from "../../serialization/BinaryWriter.ts";

export class NbtStringArray implements NbtArray<string> {
    public static readonly TYPE: NbtType<NbtStringArray> = {
        read(reader: BinaryReader): NbtStringArray {
            const len = reader.readVarUint();
            const array: string[] = new Array(len).fill(null);

            for (let i = 0; i < len; i++) {
                array[i] = reader.readString();
            }

            return new NbtStringArray(array);
        }
    };

    public readonly elements: string[];

    public constructor(value: string[]) {
        this.elements = value;
    }

    public type(): NbtTypeId {
        return NbtTypeId.StringArray;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.elements.length);
        for (const str of this.elements) {
            writer.writeString(str);
        }
    }

    public copy(): NbtStringArray {
        return new NbtStringArray(Array.from(this.elements));
    }

    public toSNBT(): string {
        const items = this.elements
            .map(s => {
                    const escaped = s
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"');
                    return `"${escaped}"`;
                }
            )
            .join(',');
        return `[${items}]`;
    }
}