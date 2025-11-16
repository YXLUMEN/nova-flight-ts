import {CommandNode} from "./CommandNode.ts";
import type {Command} from "../Command.ts";
import type {StringReader} from "../StringReader.ts";
import type {ArgumentType} from "../ArgumentType.ts";
import {ParsedArgument} from "../context/ParsedArgument.ts";
import type {Predicate} from "../../apis/types.ts";
import type {CommandContextBuilder} from "../context/CommandContextBuilder.ts";
import type {CommandContext} from "../context/CommandContext.ts";
import type {SuggestionsBuilder} from "../suggestion/SuggestionsBuilder.ts";
import type {Suggestions} from "../suggestion/Suggestions.ts";
import type {SuggestionProvider} from "../suggestion/SuggestionProvider.ts";

export class ArgumentCommandNode<S, T> extends CommandNode<S> {
    private readonly name: string;
    private readonly type: ArgumentType<T>;
    private readonly customSuggestions: SuggestionProvider<S> | null;

    public constructor(name: string, type: ArgumentType<T>, command: Command<S>, requirement: Predicate<S>, customSuggestions: SuggestionProvider<S> | null) {
        super(command, requirement);
        this.name = name;
        this.type = type;
        this.customSuggestions = customSuggestions;
    }

    public override getType(): number {
        return 2;
    }

    public override getName(): string {
        return this.name;
    }

    public override getUsageText(): string {
        return `<${this.name}>`;
    }

    public override parse(reader: StringReader, contextBuilder: CommandContextBuilder<S>) {
        const start = reader.getCursor();
        const result = this.type.parse(reader);
        const parsed = new ParsedArgument(start, reader.getCursor(), result);

        contextBuilder.withArgument(this.name, parsed);
        contextBuilder.withNode(this, parsed.range);
    }

    public override listSuggestions(context: CommandContext<S>, builder: SuggestionsBuilder): Promise<Suggestions> {
        if (this.customSuggestions === null) {
            return this.type.listSuggestions(context, builder);
        }
        return this.customSuggestions.getSuggestions(context, builder);
    }
}