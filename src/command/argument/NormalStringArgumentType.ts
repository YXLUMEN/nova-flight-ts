import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";

export class NormalStringArgumentType implements ArgumentType<string> {
    public static normalString() {
        return new NormalStringArgumentType();
    }

    public parse(reader: StringReader): string {
        return reader.readString().trim();
    }

    public listSuggestions(): Promise<Suggestions> {
        return Suggestions.empty();
    }
}