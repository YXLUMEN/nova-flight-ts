import {CommandNode} from "./tree/CommandNode.ts";
import {StringReader} from "./StringReader.ts";
import {CommandContextBuilder} from "./context/CommandContextBuilder.ts";
import {ParseResults} from "./ParseResults.ts";
import {RootCommandNode} from "./tree/RootCommandNode.ts";
import {CommandError} from "../apis/errors.ts";
import {Suggestions} from "./suggestion/Suggestions.ts";
import {SuggestionsBuilder} from "./suggestion/SuggestionsBuilder.ts";
import type {LiteralArgumentBuilder} from "./builder/LiteralArgumentBuilder.ts";

export class CommandDispatcher<S> {
    private readonly root: CommandNode<S>;

    public constructor(root?: CommandNode<S>) {
        this.root = root ?? new RootCommandNode();
    }

    public parse(command: string, source: S): ParseResults<S> {
        return this.parseReader(new StringReader(command), source);
    }

    public parseReader(command: StringReader, source: S): ParseResults<S> {
        const context = new CommandContextBuilder(this, source, this.root, command.getCursor());
        return this.parseNodes(this.root, command, context);
    }

    private parseNodes(node: CommandNode<S>, originalReader: StringReader, contextSoFar: CommandContextBuilder<S>): ParseResults<S> {
        const source = contextSoFar.source;
        const cursor = originalReader.getCursor();

        const potentials: ParseResults<S>[] = [];
        const errors: Map<CommandNode<S>, CommandError> = new Map();

        for (const child of node.getRelevantNodes(originalReader)) {
            if (!child.canUse(source)) continue;

            const context = contextSoFar.copy();
            const reader = StringReader.fromReader(originalReader);
            try {
                child.parse(reader, context);

                if (reader.canRead() && reader.peek() !== ' ') {
                    // noinspection ExceptionCaughtLocallyJS
                    throw new SyntaxError('Unexpected Char');
                }
            } catch (err) {
                if (err instanceof Error) {
                    const commandError = new CommandError(`${err.name}: ${err.message}`, 'error');
                    errors.set(child, commandError);
                } else if (err instanceof CommandError) {
                    errors.set(child, err);
                }

                reader.setCursor(cursor);
                continue;
            }

            context.withCommand(child.getCommand()!);
            if (reader.canRead(2)) {
                reader.skip();

                const parse = this.parseNodes(child, reader, context);
                potentials.push(parse);
            } else {
                potentials.push(new ParseResults(context, reader, new Map()));
            }

            if (potentials.length > 0) {
                if (potentials.length > 1) {
                    potentials.sort((a, b) => {
                        if (!a.reader.canRead() && b.reader.canRead()) {
                            return -1;
                        }
                        if (a.reader.canRead() && !b.reader.canRead()) {
                            return 1;
                        }
                        if (a.exceptions.size === 0 && b.exceptions.size !== 0) {
                            return -1;
                        }
                        if (a.exceptions.size !== 0 && b.exceptions.size === 0) {
                            return 1;
                        }
                        return 0;
                    });
                }
                return potentials[0];
            }
        }

        return new ParseResults(contextSoFar, originalReader, errors);
    }

    public getCompletionSuggestions(parse: ParseResults<S>) {
        return this.getCompletionSuggestionsWithCursor(parse, parse.reader.getTotalLength());
    }

    public async getCompletionSuggestionsWithCursor(parse: ParseResults<S>, cursor: number): Promise<Suggestions> {
        const context = parse.context;

        const nodeBeforeCursor = context.findSuggestionContext(cursor);
        const parent = nodeBeforeCursor.parent;
        const start = Math.min(nodeBeforeCursor.startPos, cursor);

        const fullInput = parse.reader.getString();
        const truncatedInput = fullInput.substring(0, cursor);
        const truncatedInputLowerCase = truncatedInput.toLowerCase();

        const futures: Promise<Suggestions>[] = new Array(parent.getOriginChildren().size);

        let i = 0;
        for (const node of parent.getChildren()) {
            let future: Promise<Suggestions> = Suggestions.empty();
            try {
                future = node.listSuggestions(
                    context.build(truncatedInput),
                    new SuggestionsBuilder(truncatedInput, truncatedInputLowerCase, start)
                );
            } catch {
            }
            futures[i++] = future;
        }

        const results = await Promise.all(futures);
        return Suggestions.merge(fullInput, results);
    }

    public getAllUsage(node: CommandNode<S>, source: S): string[] {
        const result: string[] = [];

        const optional = node.getCommand() !== null;
        for (const child of node.getChildren()) {
            const usage = this.getAllUsageInner(child, source, optional, false);
            if (usage !== null) {
                result.push(usage);
            }
        }

        return result;
    }

    private getAllUsageInner(node: CommandNode<S> | null, source: S, optional: boolean, deep: boolean): string | null {
        if (!node || !node.canUse(source)) return null;

        const self = optional ? `[${node.getUsageText()}]` : node.getUsageText();

        const childOptional = node.getCommand() !== null;
        const open = childOptional ? '[' : '(';
        const close = childOptional ? ']' : ')';

        if (deep) return self;

        const children = node.getChildren()
            .filter(child => child.canUse(source))
            .toArray();

        if (children.length === 1) {
            const next = children.values().next().value ?? null;
            const usage = this.getAllUsageInner(next, source, childOptional, childOptional);
            if (usage !== null) {
                return `${self} ${usage}`;
            }
        } else if (children.length > 1) {
            const childUsage = new Set();
            for (const child of children) {
                const usage = this.getAllUsageInner(child, source, childOptional, true);
                if (usage !== null) {
                    childUsage.add(usage);
                }
            }
            if (childUsage.size > 1) {
                const builder: string[] = [];
                builder.push(open);

                let count = 0;
                for (const child of children) {
                    if (count > 0) {
                        builder.push('|');
                    }
                    builder.push(child.getUsageText());
                    count++;
                }
                if (count > 0) {
                    builder.push(close);
                    return `${self} ${builder.join('')}`;
                }
            }
        }

        return self;
    }

    public registry(command: LiteralArgumentBuilder<S>) {
        this.root.addChild(command.build());
    }
}
