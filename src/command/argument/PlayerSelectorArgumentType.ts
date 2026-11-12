import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {CommandContext} from "../../brigadier/context/CommandContext.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import {CommandSource} from "../CommandSource.ts";
import {CommandUtil} from "../CommandUtil.ts";

export class PlayerSelectorArgumentType implements ArgumentType<string> {
    public static selector() {
        return new PlayerSelectorArgumentType();
    }

    public parse(reader: StringReader): string {
        return reader.readUnquotedString();
    }

    public listSuggestions<S>(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if (!(context.source instanceof CommandSource)) return Suggestions.empty();

        const names = (context.source as CommandSource).getPlayerNames();
        return CommandUtil.suggestMatching(names, builder);
    }
}