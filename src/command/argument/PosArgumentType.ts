import type {ArgumentType} from "../../brigadier/ArgumentType.ts";
import type {CommandContext} from "../../brigadier/context/CommandContext.ts";
import type {StringReader} from "../../brigadier/StringReader.ts";
import {Suggestions} from "../../brigadier/suggestion/Suggestions.ts";
import type {SuggestionsBuilder} from "../../brigadier/suggestion/SuggestionsBuilder.ts";
import {LookingPosArgument} from "./LookingPosArgument.ts";
import type {PosArgument} from "./PosArgument.ts";
import {DefaultPosArgument} from "./DefaultPosArgument.ts";
import {CommandSource} from "../CommandSource.ts";
import {RelativePosition} from "../../utils/math/RelativePosition.ts";
import {CommandUtil} from "../CommandUtil.ts";

export class PosArgumentType implements ArgumentType<PosArgument> {
    public static pos() {
        return new PosArgumentType();
    }

    public parse(reader: StringReader): PosArgument {
        return reader.canRead() && reader.peek() === '^' ? LookingPosArgument.parse(reader) : DefaultPosArgument.parse(reader);
    }

    public listSuggestions<S>(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if (!(context.source instanceof CommandSource)) return Suggestions.empty();

        const remain = builder.remaining;
        let collection: RelativePosition[];
        if (remain.length !== 0 && remain.charAt(0) === '^') {
            collection = [RelativePosition.ZERO_LOCAL];
        } else {
            collection = context.source.getPositionSuggestions();
        }

        return CommandUtil.suggestPositions(remain, collection, builder, CommandUtil.getCommandValidator(this.parse));
    }
}