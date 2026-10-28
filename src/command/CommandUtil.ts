import type {Identifier} from "../registry/Identifier.ts";
import type {CommandSource} from "./CommandSource.ts";
import type {SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {Consumer, Predicate, Return} from "../type/types.ts";
import type {Suggestions} from "../brigadier/suggestion/Suggestions.ts";
import type {SuggestionProvider} from "../brigadier/suggestion/SuggestionProvider.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import type {Registry} from "../registry/Registry.ts";
import {commonPrefix} from "../utils/Strings.ts";
import {RelativePosition} from "../utils/math/RelativePosition.ts";
import {StringReader} from "../brigadier/StringReader.ts";
import {CommandError} from "../type/errors.ts";
import {EntitySelector} from "./EntitySelector.ts";

export class CommandUtil {
    public static forEachMatching<T>(
        candidates: Iterable<T>,
        remaining: string,
        identifier: Return<T, Identifier>,
        action: Consumer<T>
    ): void {
        const bl = remaining.indexOf(':') > -1;

        for (const candidate of candidates) {
            const id = identifier(candidate);
            if (bl) {
                const idStr = id.toString();
                if (this.shouldSuggest(remaining, idStr)) {
                    action(candidate);
                }
                continue;
            }
            if (
                this.shouldSuggest(remaining, id.getNamespace()) ||
                id.getNamespace() === 'nova-flight' &&
                this.shouldSuggest(remaining, id.getPath())
            ) {
                action(candidate);
            }
        }
    }

    public static forEachMatchingPrefix<T>(
        candidates: Iterable<T>,
        remaining: string,
        prefix: string,
        identifier: Return<T, Identifier>,
        action: Consumer<T>
    ): void {
        if (remaining.length === 0) {
            for (const candidate of candidates) {
                action(candidate);
            }
            return;
        }

        const same = commonPrefix(remaining, prefix);
        if (same.length > 0) {
            const text = remaining.substring(same.length);
            this.forEachMatching(candidates, text, identifier, action);
        }
    }

    public static suggestIdentifiers(candidates: Iterable<Identifier>, builder: SuggestionsBuilder): Promise<Suggestions> {
        const remaining = builder.remainingLowerCase;
        this.forEachMatching(candidates, remaining, id => id, id => builder.suggest(id.toString()));
        return builder.buildPromise();
    }

    public static suggestIdentifiersPrefix(candidates: Iterable<Identifier>, builder: SuggestionsBuilder, prefix: string): Promise<Suggestions> {
        const remaining = builder.remainingLowerCase;
        this.forEachMatchingPrefix(candidates, remaining, prefix, id => id, id => builder.suggest(`${prefix}${id}`));
        return builder.buildPromise();
    }

    public static createIdentifierSuggestion<T>(registry: Registry<any>): SuggestionProvider<T> {
        return {
            getSuggestions(_: CommandContext<T>, builder: SuggestionsBuilder): Promise<Suggestions> {
                return CommandUtil.suggestIdentifiers(registry.getIds(), builder);
            }
        };
    }

    public static suggestPositions(remain: string, candidates: RelativePosition[], builder: SuggestionsBuilder, predicate: Predicate<string>) {
        const list: string[] = [];
        if (remain.length === 0) {
            for (const pos of candidates) {
                const posStr = `${pos.x} ${pos.y}`;
                if (predicate(posStr)) {
                    list.push(pos.x);
                    list.push(posStr);
                }
            }

            return this.suggestMatching(list, builder);
        }

        const remains = remain.split(' ');
        if (remains.length === 1) for (const pos of candidates) {
            const posStr = `${remains[0]} ${pos.y}`;
            if (predicate(posStr)) {
                list.push(posStr);
            }
        }

        return this.suggestMatching(list, builder);
    }

    public static suggestMatching(candidates: Iterable<string>, builder: SuggestionsBuilder) {
        const text = builder.remainingLowerCase;
        for (const candidate of candidates) {
            if (this.shouldSuggest(text, candidate)) {
                builder.suggest(candidate);
            }
        }

        return builder.buildPromise();
    }

    public static shouldSuggest(remaining: string, candidate: string): boolean {
        for (let i = 0; !candidate.startsWith(remaining, i); i++) {
            const j = candidate.indexOf('.', i);
            const k = candidate.indexOf('_', i);
            if (Math.max(j, k) < 0) {
                return false;
            }

            if (j >= 0 && k >= 0) {
                i = Math.min(k, j);
            } else {
                i = j >= 0 ? j : k;
            }
        }

        return true;
    }

    public static getCommandValidator(parser: Consumer<StringReader>): Predicate<string> {
        return text => {
            try {
                parser(new StringReader(text));
                return true;
            } catch (err) {
                return false;
            }
        }
    }

    public static assert<T extends CommandSource, U>(ctx: CommandContext<T>, arg: string, map?: Return<any, U>): U {
        const result = ctx.args.get(arg);
        if (!result) throw new CommandError(`\x1b[33m<${arg}> is required`);
        return map ? map(result.result) : result.result;
    }

    public static as<T extends CommandSource, U>(ctx: CommandContext<T>, arg: string, predicate: Predicate<unknown>): U {
        const result = ctx.args.get(arg);
        if (!result) throw new CommandError(`\x1b[33m<${arg}> is required`);

        const value = result.result;
        if (predicate(value)) return value as U;
        throw new CommandError('Unmatch type');
    }

    public static assertSelector<T extends CommandSource>(ctx: CommandContext<T>, arg: string) {
        const selectorResult = ctx.args.get(arg);
        if (!selectorResult) throw new CommandError("\x1b[33m<selector> is required");

        const selector = selectorResult.result;
        if (selector instanceof EntitySelector) {
            return selector;
        }

        throw new CommandError('Not a entity selector');
    }

    public static assertWorld<T extends CommandSource>(ctx: CommandContext<T>) {
        const world = ctx.source.getWorld();
        if (!world) throw new CommandError("No world was found.");
        return world;
    }
}