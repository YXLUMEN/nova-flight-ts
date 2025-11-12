import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";

export class IntArgumentType implements ArgumentType<number> {
    public static int() {
        return new IntArgumentType();
    }

    public parse(reader: StringReader): number {
        return reader.readInt();
    }

    public listSuggestions(): Promise<Suggestions> {
        return Suggestions.empty()
    }
}