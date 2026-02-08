import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import type {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import {NbtUnserialization} from "../../nbt/NbtUnserialization.ts";

export class NbtCompoundArgumentType implements ArgumentType<NbtCompound> {
    public static nbt() {
        return new NbtCompoundArgumentType();
    }

    public parse(reader: StringReader): NbtCompound {
        reader.skipAnyWhitespace();
        reader.expect('{');
        return NbtUnserialization.parseStringCompound(reader);
    }

    public listSuggestions(): Promise<Suggestions> {
        return Suggestions.empty();
    }
}