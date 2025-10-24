import {CommandNode} from "./CommandNode.ts";
import type {Command} from "./Command.ts";
import type {Predicate} from "../apis/types.ts";
import type {StringReader} from "./StringReader.ts";
import type {CommandContextBuilder} from "./context/CommandContextBuilder.ts";
import {StringRange} from "./StringRange.ts";

export class LiteralCommandNode<S> extends CommandNode<S> {
    private readonly literal: string;
    public readonly literalLowerCase: string;

    public constructor(literal: string, command: Command<S>, requirement: Predicate<S>) {
        super(command, requirement);
        this.literal = literal;
        this.literalLowerCase = literal.toLowerCase();
    }

    public getLiteral() {
        return this.literal;
    }

    public override getType(): number {
        return 1;
    }

    public override getName(): string {
        return this.literal;
    }

    public override getUsageText(): string {
        return this.literal;
    }

    public override parse(reader: StringReader, contextBuilder: CommandContextBuilder<S>): void {
        const start = reader.getCursor();
        const end = this.parseReader(reader);
        if (end > -1) {
            contextBuilder.withNode(this, StringRange.between(start, end));
            return;
        }

        throw new Error(`Expected literal '${this.literal}' at ${start}`);
    }

    private parseReader(reader: StringReader): number {
        const start = reader.getCursor();
        if (!reader.canRead(this.literal.length)) return -1;

        const end = start + this.literal.length;
        if (reader.getString().substring(start, end) === this.literal) {
            reader.setCursor(end);
            if (!reader.canRead() || reader.peek() === ' ') {
                return end;
            }
            reader.setCursor(start);
        }

        return -1;
    }
}