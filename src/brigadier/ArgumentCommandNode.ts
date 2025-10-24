import {CommandNode} from "./CommandNode.ts";
import type {Command} from "./Command.ts";
import type {StringReader} from "./StringReader.ts";
import type {ArgumentType} from "./ArgumentType.ts";
import {ParsedArgument} from "./context/ParsedArgument.ts";
import type {Predicate} from "../apis/types.ts";
import type {CommandContextBuilder} from "./context/CommandContextBuilder.ts";

export class ArgumentCommandNode<S, T> extends CommandNode<S> {
    private readonly name: string;
    private readonly type: ArgumentType<T>;
    public readonly customSuggestions: any;

    public constructor(name: string, type: ArgumentType<T>, command: Command<S>, requirement: Predicate<S>, customSuggestions: any) {
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
}