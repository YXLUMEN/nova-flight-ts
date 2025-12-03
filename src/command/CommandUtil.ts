import type {Identifier} from "../registry/Identifier.ts";
import {type SuggestionsBuilder} from "../brigadier/suggestion/SuggestionsBuilder.ts";
import type {Consumer, FunctionReturn, Predicate} from "../apis/types.ts";
import {commonPrefix} from "../utils/Strings.ts";
import {type Suggestions} from "../brigadier/suggestion/Suggestions.ts";
import type {SuggestionProvider} from "../brigadier/suggestion/SuggestionProvider.ts";
import type {CommandContext} from "../brigadier/context/CommandContext.ts";
import {createClean} from "../utils/uit.ts";
import type {Registry} from "../registry/Registry.ts";
import {RelativePosition} from "../utils/math/RelativePosition.ts";
import {StringReader} from "../brigadier/StringReader.ts";

export class CommandUtil {
    public static forEachMatching<T>(
        candidates: Iterable<T>,
        remaining: string,
        identifier: FunctionReturn<T, Identifier>,
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
            } else if (
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
        identifier: FunctionReturn<T, Identifier>,
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
        return createClean({
            getSuggestions(_: CommandContext<T>, builder: SuggestionsBuilder): Promise<Suggestions> {
                return CommandUtil.suggestIdentifiers(registry.getIdValues(), builder);
            }
        } satisfies SuggestionProvider<T>);
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
}