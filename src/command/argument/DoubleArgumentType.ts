import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";

export class DoubleArgumentType implements ArgumentType<number> {
    public static double() {
        return new DoubleArgumentType();
    }

    public parse(reader: StringReader): number {
        return reader.readDouble();
    }

    public listSuggestions(): Promise<Suggestions> {
        return Suggestions.empty()
    }
}