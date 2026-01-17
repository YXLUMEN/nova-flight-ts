import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {CommandContext} from "../../brigadier/context/CommandContext.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {CommandSource} from "../CommandSource.ts";
import type {ServerWorld} from "../../server/ServerWorld.ts";

export class PlayerSelectorArgumentType implements ArgumentType<string> {
    public static selector() {
        return new PlayerSelectorArgumentType();
    }

    public parse(reader: StringReader): string {
        return reader.readUnquotedString();
    }

    public listSuggestions<S>(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if (!(context.source instanceof CommandSource)) return Suggestions.empty();

        const world = context.source.getWorld() as ServerWorld | null;
        if (!world || world.isClient) return Suggestions.empty();

        for (const player of world.getPlayers()) {
            const name = player.getProfile().name;
            if (name.startsWith(builder.remainingLowerCase)) {
                builder.suggest(name);
            }
        }

        return builder.buildPromise();
    }
}