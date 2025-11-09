import type {CommandContextBuilder} from "./context/CommandContextBuilder.ts";
import type {CommandNode} from "./CommandNode.ts";
import {StringReader} from "./StringReader.ts";
import type {CommandError} from "../apis/errors.ts";

export class ParseResults<S> {
    public readonly context: CommandContextBuilder<S>;
    public readonly exceptions: Map<CommandNode<S>, CommandError>;
    public readonly reader: StringReader;

    public constructor(context: CommandContextBuilder<S>, reader: StringReader, exceptions: Map<CommandNode<S>, CommandError>) {
        this.context = context;
        this.exceptions = exceptions;
        this.reader = reader;
    }

    public static empty<S>(context: CommandContextBuilder<S>) {
        return new ParseResults(context, new StringReader(''), new Map());
    }
}