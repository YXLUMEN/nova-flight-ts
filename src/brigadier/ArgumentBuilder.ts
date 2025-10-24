import {ArgumentCommandNode} from "./ArgumentCommandNode.ts";
import type {Command} from "./Command.ts";
import type {LiteralBuilder} from "./LiteralBuilder.ts";
import type {Predicate} from "../apis/types.ts";
import type {ArgumentType} from "./ArgumentType.ts";

export class ArgumentBuilder<S, T> {
    private readonly name: string;
    private readonly parser: ArgumentType<T>;
    private command!: Command<S>;
    private requirement: Predicate<S> = () => true;
    private children: (LiteralBuilder<S> | ArgumentBuilder<S, any>)[] = [];

    public constructor(name: string, parser: ArgumentType<T>) {
        this.name = name;
        this.parser = parser;
    }

    public then(child: LiteralBuilder<S> | ArgumentBuilder<S, any>): this {
        this.children.push(child);
        return this;
    }

    public executes(command: Command<S>): this {
        this.command = command;
        return this;
    }

    public withRequirement(requirement: Predicate<S>): this {
        this.requirement = requirement;
        return this;
    }

    public build(): ArgumentCommandNode<S, T> {
        const node = new ArgumentCommandNode<S, T>(this.name, this.parser, this.command, this.requirement, null);
        for (const child of this.children) {
            node.addChild(child.build());
        }
        return node;
    }
}
