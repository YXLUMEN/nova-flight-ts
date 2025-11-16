import type {CommandNode} from "../tree/CommandNode.ts";
import type {StringRange} from "./StringRange.ts";

export class ParsedCommandNode<S> {
    public readonly node: CommandNode<S>;
    public readonly range: StringRange;

    public constructor(node: CommandNode<S>, range: StringRange) {
        this.node = node;
        this.range = range;
    }
}