import type {Command} from "./Command.ts";
import {LiteralCommandNode} from "./LiteralCommandNode.ts";
import type {ArgumentBuilder} from "./ArgumentBuilder.ts";
import type {Predicate} from "../apis/types.ts";

export class LiteralBuilder<S> {
    private readonly name: string;
    private command!: Command<S>;
    private requirement: Predicate<S> = () => true;
    private children: (LiteralBuilder<S> | ArgumentBuilder<S, any>)[] = [];

    public constructor(name: string) {
        this.name = name;
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

    public build(): LiteralCommandNode<S> {
        const node = new LiteralCommandNode<S>(this.name, this.command, this.requirement);
        for (const child of this.children) {
            node.addChild(child.build());
        }
        return node;
    }
}
