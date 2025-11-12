import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import {StringReader} from "../../brigadier/StringReader.ts";
import {type CommandContext} from "../../brigadier/context/CommandContext.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import {CommandSource} from "../CommandSource.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import {EntitySelectorReader} from "../EntitySelectorReader.ts";
import type {EntitySelector} from "../EntitySelector.ts";

export class EntitySelectorArgumentType implements ArgumentType<EntitySelector> {
    public static selector() {
        return new EntitySelectorArgumentType();
    }

    public parse(reader: StringReader): EntitySelector {
        const entitySelectorReader = new EntitySelectorReader(reader);
        return entitySelectorReader.read();
    }

    public listSuggestions<S>(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if (!(context.source instanceof CommandSource)) return Suggestions.empty();

        const reader = new StringReader(builder.input);
        reader.setCursor(builder.start);
        const entitySelectorReader = new EntitySelectorReader(reader);

        try {
            entitySelectorReader.read();
        } catch {
        }

        return entitySelectorReader.listSuggestions(builder, () => {
        });
    }
}
