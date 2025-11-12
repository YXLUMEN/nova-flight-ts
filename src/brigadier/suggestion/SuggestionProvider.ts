import type {Suggestions} from "./Suggestions.ts";
import type {CommandContext} from "../context/CommandContext.ts";
import type {SuggestionsBuilder} from "./SuggestionsBuilder.ts";

export interface SuggestionProvider<S> {
    getSuggestions(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions>;
}