import type {CommandNode} from "../tree/CommandNode.ts";
import type {Command} from "../Command.ts";
import type {CommandDispatcher} from "../CommandDispatcher.ts";
import {StringRange} from "./StringRange.ts";
import {CommandContext} from "./CommandContext.ts";
import type {ParsedArgument} from "./ParsedArgument.ts";
import {SuggestionContext} from "./SuggestionContext.ts";
import {ParsedCommandNode} from "./ParsedCommandNode.ts";
import {IllegalStateException} from "../../apis/errors.ts";

export class CommandContextBuilder<S> {
    public readonly dispatcher: CommandDispatcher<S>;

    public readonly rootNode: CommandNode<S>;
    public readonly args: Map<string, ParsedArgument<S, any>> = new Map();
    public readonly nodes: ParsedCommandNode<S>[] = [];
    public command: Command<S> | null = null;
    public child: CommandContextBuilder<S> | null;
    public source: S;
    public range: StringRange;

    public constructor(dispatcher: CommandDispatcher<S>, source: S, rootNode: CommandNode<S>, start: number) {
        this.dispatcher = dispatcher;
        this.rootNode = rootNode;
        this.source = source;
        this.range = StringRange.at(start);
        this.child = null;
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
        this.nodes.push(new ParsedCommandNode(node, range));
        this.range = StringRange.encompassing(this.range, range);
        return this;
    }

    public withChild(child: CommandContextBuilder<S>): this {
        this.child = child;
        return this;
    }

    public copy(): CommandContextBuilder<S> {
        const copy = new CommandContextBuilder<S>(this.dispatcher, this.source, this.rootNode, this.range.getStart());
        copy.command = this.command;
        this.args.forEach((v, k) => copy.args.set(k, v));
        copy.nodes.concat(this.nodes);
        copy.child = this.child;
        copy.range = this.range;
        return copy;
    }

    public build(input: string): CommandContext<S> {
        return new CommandContext(this.source, input, this.args, this.command!, this.nodes, this.range);
    }

    public getLastChild(): CommandContextBuilder<S> {
        let result: CommandContextBuilder<S> = this;
        while (result.child !== null) {
            result = result.child;
        }
        return result;
    }

    public findSuggestionContext(cursor: number): SuggestionContext<S> {
        if (this.range.getStart() > cursor) {
            throw new IllegalStateException("Can't find node before cursor");
        }

        if (this.range.getEnd() < cursor) {
            if (this.child !== null) {
                return this.child.findSuggestionContext(cursor);
            }
            if (this.nodes.length !== 0) {
                const lastNode = this.nodes.at(-1)!;
                return new SuggestionContext(lastNode.node, lastNode.range.getEnd() + 1);
            }
            return new SuggestionContext(this.rootNode, this.range.getStart());
        }

        let prev = this.rootNode;
        for (const node of this.nodes) {
            const nodeRange = node.range;
            if (nodeRange.getStart() <= cursor && cursor <= nodeRange.getEnd()) {
                return new SuggestionContext(prev, nodeRange.getStart());
            }
            prev = node.node;
        }
        if (prev === null) {
            throw new IllegalStateException("Can't find node before cursor");
        }
        return new SuggestionContext(prev, this.range.getStart());
    }
}