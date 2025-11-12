import type {ArgumentType} from "../ArgumentType.ts";
import {RequiredArgumentBuilder} from "./RequiredArgumentBuilder.ts";
import {LiteralArgumentBuilder} from "./LiteralArgumentBuilder.ts";

export function argument<S, T>(name: string, parser: ArgumentType<T>): RequiredArgumentBuilder<S, T> {
    return new RequiredArgumentBuilder<S, T>(name, parser);
}

export function literal<S>(name: string): LiteralArgumentBuilder<S> {
    return new LiteralArgumentBuilder<S>(name);
}
