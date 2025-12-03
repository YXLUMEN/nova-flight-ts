import {ArgumentBuilder} from "./ArgumentBuilder.ts";
import type {CommandNode} from "../tree/CommandNode.ts";
import {LiteralCommandNode} from "../tree/LiteralCommandNode.ts";

export class LiteralArgumentBuilder<S> extends ArgumentBuilder<S, LiteralArgumentBuilder<S>> {
    public readonly literal: string;

    public constructor(literal: string) {
        super();
        this.literal = literal;
    }

    protected override getThis(): LiteralArgumentBuilder<S> {
        return this;
    }

    public override build(): CommandNode<S> {
        const result = new LiteralCommandNode(this.literal, this.getCommand(), this.getRequirement());

        for (const argument of this.getArguments()) {
            result.addChild(argument);
        }

        return result;
    }
}