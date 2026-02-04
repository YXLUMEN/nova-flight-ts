import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId, type NbtTypeIndex} from "../NbtType.ts";
import {config, deepFreeze} from "../../utils/uit.ts";
import type {BinaryReader} from "../BinaryReader.ts";
import type {BinaryWriter} from "../BinaryWriter.ts";

export class NbtU32 implements NbtElement {
    public static readonly TYPE: NbtType<NbtU32> = config({
        read(reader: BinaryReader) {
            return NbtU32.of(reader.readUint32());
        }
    });

    public static of(value: number): NbtU32 {
        return value >= 0 && value <= 512 ? this.cache[value] : new NbtU32(value);
    }

    public readonly value: number;

    private constructor(value: number) {
        this.value = value | 0;
    }

    public getType(): NbtTypeIndex {
        return NbtTypeId.U32;
    }

    public write(writer: BinaryWriter): void {
        writer.writeUint32(this.value);
    }

    private static readonly cache: NbtU32[] = new Array<NbtU32>(513);
    static {
        for (let i = 0; i < this.cache.length; i++) {
            this.cache[i] = new NbtU32(i);
        }
        deepFreeze(this.cache);
    }

    public toString(): string {
        return `${this.value}U`;
    }
}