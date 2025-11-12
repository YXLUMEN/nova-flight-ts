import {ArgumentBuilder} from "./ArgumentBuilder.ts";
import type {ArgumentType} from "../ArgumentType.ts";
import type {SuggestionProvider} from "../suggestion/SuggestionProvider.ts";
import type {CommandNode} from "../CommandNode.ts";
import {ArgumentCommandNode} from "../ArgumentCommandNode.ts";

export class RequiredArgumentBuilder<S, T> extends ArgumentBuilder<S, RequiredArgumentBuilder<S, T>> {
    public readonly name: string;
    public readonly type: ArgumentType<T>;
    public suggestionsProvider: SuggestionProvider<S> | null = null;

    public constructor(name: string, type: ArgumentType<T>) {
        super();
        this.name = name;
        this.type = type;
    }

    protected override getThis(): RequiredArgumentBuilder<S, T> {
        return this;
    }

    public suggests(provider: SuggestionProvider<S>) {
        this.suggestionsProvider = provider;
        return this.getThis();
    }

    public override build(): CommandNode<S> {
        const result = new ArgumentCommandNode(this.name, this.type, this.command, this.getRequirement(), this.suggestionsProvider);

        for (const argument of this.getArguments()) {
            result.addChild(argument);
        }

        return result;
    }
}