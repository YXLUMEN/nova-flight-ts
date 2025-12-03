import type {Command} from "../Command.ts";
import type {Predicate} from "../../apis/types.ts";
import type {CommandNode} from "../tree/CommandNode.ts";
import {RootCommandNode} from "../tree/RootCommandNode.ts";

export abstract class ArgumentBuilder<S, T extends ArgumentBuilder<S, T>> {
    private readonly arguments = new RootCommandNode<S>();

    private command: Command<S> | null = null;
    private requirement: Predicate<S> = () => true;

    protected abstract getThis(): T;

    public then(argument: ArgumentBuilder<S, any>): T {
        this.arguments.addChild(argument.build());
        return this.getThis();
    }

    public thenNode(argument: CommandNode<S>): T {
        this.arguments.addChild(argument);
        return this.getThis();
    }

    public executes(command: Command<S>): T {
        this.command = command;
        return this.getThis();
    }

    public getCommand(): Command<S> {
        return this.command!;
    }

    public requires(requirement: Predicate<S>): T {
        this.requirement = requirement;
        return this.getThis();
    }

    public getRequirement(): Predicate<S> {
        return this.requirement;
    }

    public getArguments() {
        return this.arguments.getChildren();
    }

    public abstract build(): CommandNode<S>;
}
