import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import {StringReader} from "../../brigadier/StringReader.ts";
import {type CommandContext} from "../../brigadier/context/CommandContext.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import {CommandSource} from "../CommandSource.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import {EntitySelectorReader} from "../EntitySelectorReader.ts";
import type {EntitySelector} from "../EntitySelector.ts";
import {CommandError} from "../../apis/errors.ts";
import {CommandUtil} from "../CommandUtil.ts";

export class EntitySelectorArgumentType implements ArgumentType<EntitySelector> {
    public static readonly TOO_MANY_ENTITIES = new CommandError('Too many entities be selected.');
    public static readonly TOO_MANY_PLAYERS = new CommandError('Too many players be selected.');
    public static readonly PLAYER_SELECTOR_HAS_ENTITIES = new CommandError('A players only selector has entities.');

    private readonly singleTarget: boolean;
    private readonly playersOnly: boolean;

    public constructor(singleTarget: boolean, playersOnly: boolean) {
        this.singleTarget = singleTarget;
        this.playersOnly = playersOnly;
    }

    public static entities() {
        return new EntitySelectorArgumentType(false, false);
    }

    public static entity() {
        return new EntitySelectorArgumentType(true, false);
    }

    public static player() {
        return new EntitySelectorArgumentType(true, true);
    }

    public static players() {
        return new EntitySelectorArgumentType(false, true);
    }

    public parse(reader: StringReader): EntitySelector {
        const entitySelectorReader = new EntitySelectorReader(reader);
        const selector = entitySelectorReader.read();

        if (selector.limit > 1 && this.singleTarget) {
            reader.setCursor(0);
            if (this.playersOnly) {
                throw EntitySelectorArgumentType.TOO_MANY_PLAYERS;
            }
            throw EntitySelectorArgumentType.TOO_MANY_ENTITIES;
        }
        if (selector.includesNonPlayers && this.playersOnly && !selector.senderOnly) {
            reader.setCursor(0);
            throw EntitySelectorArgumentType.PLAYER_SELECTOR_HAS_ENTITIES;
        }

        return selector;
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

        return entitySelectorReader.listSuggestions(builder, builder2 => {
            if (this.playersOnly) {
                const names = (context.source as CommandSource).getPlayerNames();
                CommandUtil.suggestMatching(names, builder2).catch(console.error);
            }
        });
    }
}
