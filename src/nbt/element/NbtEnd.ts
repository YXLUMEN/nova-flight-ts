import type {NbtElement} from "./NbtElement.ts";
import {type NbtType, NbtTypeId} from "../NbtType.ts";

export class NbtEnd implements NbtElement {
    public static readonly TYPE: NbtType<NbtEnd> = {
        read(): NbtEnd {
            return NbtEnd.INSTANCE;
        }
    };

    public readonly type = NbtTypeId.End;
    public static readonly INSTANCE = new NbtEnd();

    private constructor() {
    }

    public getType(): NbtTypeId {
        return 0;
    }

    public copy(): NbtEnd {
        return this;
    }

    public write() {
    }
}