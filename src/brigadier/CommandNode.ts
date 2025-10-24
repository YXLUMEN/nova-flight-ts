import type {Predicate} from "../apis/types.ts";
import type {Command} from "./Command.ts";
import type {LiteralCommandNode} from "./LiteralCommandNode.ts";
import type {ArgumentCommandNode} from "./ArgumentCommandNode.ts";
import type {StringReader} from "./StringReader.ts";
import type {CommandContextBuilder} from "./context/CommandContextBuilder.ts";

export abstract class CommandNode<S> {
    private readonly children: Map<string, CommandNode<S>> = new Map();
    private readonly literals: Map<string, LiteralCommandNode<S>> = new Map();
    private readonly arguments: Map<string, ArgumentCommandNode<S, any>> = new Map();

    private readonly requirement: Predicate<S>;
    private command: Command<S> | null;

    protected constructor(command: Command<S> | null, requirement: Predicate<S>) {
        this.command = command;
        this.requirement = requirement;
    }

    public getCommand(): Command<S> | null {
        return this.command;
    }

    public setCommand(command: Command<S> | null): void {
        this.command = command;
    }

    public getChildren() {
        return this.children.values();
    }

    public getChild(name: string) {
        return this.children.get(name) ?? null;
    }

    public canUse(source: S): boolean {
        return this.requirement(source);
    }

    public addChild(node: CommandNode<S>): void {
        if (node.getType() === 0) {
            throw new Error("Cannot add a RootCommandNode as a child to any other CommandNode");
        }

        const child = this.children.get(node.getName());
        if (child) {
            if (node.getCommand() !== null) {
                child.setCommand(node.getCommand());
            }
            for (const grandChild of node.getChildren()) {
                child.addChild(grandChild);
            }
            return;
        }

        this.children.set(node.getName(), node);
        if (node.getType() === 1) {
            this.literals.set(node.getName(), node as LiteralCommandNode<S>);
        } else if (node.getType() === 2) {
            this.arguments.set(node.getName(), node as ArgumentCommandNode<S, any>);
        }
    }

    // 防止提前引用
    public abstract getType(): number;

    public abstract getName(): string;

    public abstract getUsageText(): string;

    public abstract parse(reader: StringReader, contextBuilder: CommandContextBuilder<S>): void;

    public getRelevantNodes(input: StringReader): Iterable<CommandNode<S>> {
        if (this.literals.size <= 0) return this.arguments.values();

        const cursor = input.getCursor();
        while (input.canRead() && input.peek() !== ' ') {
            input.skip();
        }

        const text = input.getString().substring(cursor, input.getCursor());
        input.setCursor(cursor);

        const literal = this.literals.get(text);
        if (literal) {
            return [literal];
        }
        return this.arguments.values();
    }
}