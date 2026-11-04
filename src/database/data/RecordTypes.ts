import type {FileBuffer} from "../../type/types.ts";
import {Identifier} from "../../registry/Identifier.ts";
import {RecordType} from "./RecordType.ts";

/**
 * 用于储存双端都需要的数据
 *
 * @see{ClientRecordRegister}
 * @see{ServerRecordRegister}
 * */
export class RecordTypes {
    public static readonly TECH = this.create<ArrayBuffer>('tech');
    public static readonly TAGS = this.create<FileBuffer[]>('tags');

    public static create<T>(id: string) {
        return new RecordType<T>(Identifier.ofVanilla(id));
    }
}