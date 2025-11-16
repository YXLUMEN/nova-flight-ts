import type {Command} from "../Command.ts";
import type {StringRange} from "./StringRange.ts";
import type {ParsedArgument} from "./ParsedArgument.ts";
import type {ParsedCommandNode} from "./ParsedCommandNode.ts";

export class CommandContext<S> {
    public readonly source: S;
    public readonly command: Command<S>;
    public readonly input: string;
    public readonly args: Map<string, ParsedArgument<S, any>>;
    public readonly range: StringRange;
    public readonly nodes: ParsedCommandNode<S>[];

    public constructor(source: S, input: string, args: Map<string, ParsedArgument<S, any>>, command: Command<S>, nodes: ParsedCommandNode<S>[], range: StringRange) {
        this.source = source;
        this.command = command;
        this.input = input;
        this.args = args;
        this.nodes = nodes;
        this.range = range;
    }

    public getArgument<V>(name: string): V {
        const arg = this.args.get(name) ?? null;

        if (arg === null) {
            throw new Error(`No such argument "${name}" exists on this command`);
        }
        return arg.result as V;
    }
}
