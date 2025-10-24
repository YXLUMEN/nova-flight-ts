import {CommandNode} from "./CommandNode.ts";

export class RootCommandNode<S> extends CommandNode<S> {
    public constructor() {
        super(null, () => true);
    }

    public override getType(): number {
        return 0;
    }

    public override getName(): string {
        return "";
    }

    public getUsageText(): string {
        return "";
    }

    public override parse() {
    }
}