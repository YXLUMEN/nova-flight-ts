import {LiteralBuilder} from "./LiteralBuilder.ts";
import {ArgumentBuilder} from "./ArgumentBuilder.ts";
import type {ArgumentType} from "./ArgumentType.ts";

export function literal<S>(name: string): LiteralBuilder<S> {
    return new LiteralBuilder<S>(name);
}

export function argument<S, T>(name: string, parser: ArgumentType<T>): ArgumentBuilder<S, T> {
    return new ArgumentBuilder<S, T>(name, parser);
}
