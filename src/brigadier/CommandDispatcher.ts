import {CommandNode} from "./CommandNode.ts";
import {StringReader} from "./StringReader.ts";
import type {LiteralBuilder} from "./LiteralBuilder.ts";
import {CommandContextBuilder} from "./context/CommandContextBuilder.ts";
import {ParseResults} from "./ParseResults.ts";
import {RootCommandNode} from "./RootCommandNode.ts";

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

    public parseNodes(node: CommandNode<S>, originalReader: StringReader, contextSoFar: CommandContextBuilder<S>): ParseResults<S> {
        const source = contextSoFar.source;
        const cursor = originalReader.getCursor();

        const potentials: ParseResults<S>[] = [];
        const errors: Map<CommandNode<S>, Error> = new Map();

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
                if (err instanceof Error) errors.set(child, err);
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

    public registry<S>(command: LiteralBuilder<S>) {
        // @ts-ignore
        this.root.addChild(command.build());
    }
}
