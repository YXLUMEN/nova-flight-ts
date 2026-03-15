import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId, type NbtTypeIndex} from "../NbtType.ts";
import {config} from "../../utils/uit.ts";
import type {BinaryReader} from "../BinaryReader.ts";
import type {BinaryWriter} from "../BinaryWriter.ts";

export class NbtUint8Array implements NbtElement {
    public static readonly TYPE: NbtType<NbtUint8Array> = config({
        read(reader: BinaryReader): NbtUint8Array {
            const len = reader.readVarUint();
            const bytes = new Uint8Array(len);

            for (let i = 0; i < len; i++) {
                bytes[i] = reader.readUint8();
            }

            return new NbtUint8Array(bytes);
        }
    });

    public readonly value: Uint8Array;

    public constructor(value: Uint8Array) {
        this.value = value;
    }

    public static create(list: number[]) {
        return new NbtUint8Array(new Uint8Array(list));
    }

    public getType(): NbtTypeIndex {
        return NbtTypeId.Uint8Array;
    }

    public write(writer: BinaryWriter): void {
        writer.writeVarUint(this.value.length);
        for (const num of this.value) {
            writer.writeInt8(num);
        }
    }

    public copy(): NbtUint8Array {
        return new NbtUint8Array(new Uint8Array(this.value));
    }

    public toString(): string {
        return `[UB;${this.value.join(',')}]`;
    }
}
