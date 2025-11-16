import type {CommandNode} from "../tree/CommandNode.ts";

export class SuggestionContext<S> {
    public readonly parent: CommandNode<S>;
    public readonly startPos: number;

    public constructor(parent: CommandNode<S>, startPos: number) {
        this.parent = parent;
        this.startPos = startPos;
    }
}