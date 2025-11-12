import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {IllegalArgumentError} from "../../apis/errors.ts";
import type {CommandContext} from "../../brigadier/context/CommandContext.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import type {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";

export class BoolArgumentType implements ArgumentType<boolean> {
    public static bool() {
        return new BoolArgumentType();
    }

    public parse(reader: StringReader): boolean {
        const bool = reader.readUnquotedString();
        if (bool === 'true' || bool === 'false') {
            return JSON.parse(bool);
        }
        throw new IllegalArgumentError('Must input a boolean');
    }

    public listSuggestions<S>(_: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if ('true'.startsWith(builder.remainingLowerCase)) {
            builder.suggest('true');
        }
        if ('false'.startsWith(builder.remainingLowerCase)) {
            builder.suggest('false');
        }

        return builder.buildPromise();
    }
}