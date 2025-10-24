import type {CommandNode} from "../CommandNode.ts";
import type {Command} from "../Command.ts";
import type {CommandDispatcher} from "../CommandDispatcher.ts";
import {StringRange} from "../StringRange.ts";
import {CommandContext} from "./CommandContext.ts";
import type {ParsedArgument} from "./ParsedArgument.ts";

export class CommandContextBuilder<S> {
    public readonly dispatcher: CommandDispatcher<S>;

    public readonly rootNode: CommandNode<S>;
    public readonly args: Map<string, ParsedArgument<S, any>> = new Map();
    public readonly nodes: CommandNode<S>[] = [];
    public command!: Command<S>;
    public source: S;
    public range: StringRange;

    public constructor(dispatcher: CommandDispatcher<S>, source: S, rootNode: CommandNode<S>, start: number) {
        this.dispatcher = dispatcher;
        this.rootNode = rootNode;
        this.source = source;
        this.range = StringRange.at(start);
    }

    public withSource(source: S): this {
        this.source = source;
        return this;
    }

    public withArgument(name: string, arg: ParsedArgument<S, any>): this {
        this.args.set(name, arg);
        return this;
    }

    public withCommand(command: Command<S>): this {
        this.command = command;
        return this;
    }

    public withNode(node: CommandNode<S>, range: StringRange): this {
        this.nodes.push(node);
        this.range = StringRange.encompassing(this.range, range);
        return this;
    }

    public copy() {
        const copy = new CommandContextBuilder<S>(this.dispatcher, this.source, this.rootNode, this.range.start);
        copy.command = this.command;
        this.args.forEach((v, k) => copy.args.set(k, v));
        copy.nodes.concat(this.nodes);
        copy.range = this.range;
        return copy;
    }

    public build(input: string): CommandContext<S> {
        return new CommandContext(this.source, input, this.args, this.command, this.nodes, this.range);
    }
}