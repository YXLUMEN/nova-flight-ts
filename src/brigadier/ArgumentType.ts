import type {StringReader} from "./StringReader.ts";
import type {CommandContext} from "./context/CommandContext.ts";
import type {Suggestions} from "./suggestion/Suggestions.ts";
import type {SuggestionsBuilder} from "./suggestion/SuggestionsBuilder.ts";

export interface ArgumentType<T> {
    parse(reader: StringReader): T;

    listSuggestions<S>(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions>;
}