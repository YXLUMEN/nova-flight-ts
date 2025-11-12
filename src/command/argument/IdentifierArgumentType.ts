import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import {Identifier} from "../../registry/Identifier.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";

export class IdentifierArgumentType implements ArgumentType<Identifier> {
    public static identifier() {
        return new IdentifierArgumentType();
    }

    public parse(reader: StringReader): Identifier {
        return Identifier.fromCommandInput(reader);
    }

    public listSuggestions(): Promise<Suggestions> {
        return Suggestions.empty();
    }
}