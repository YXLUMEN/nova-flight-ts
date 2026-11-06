import type {Suggestion} from "./Suggestion.ts";
import {MAX_INT, MIN_INT} from "../../utils/math/math.ts";
import {StringRange} from "../context/StringRange.ts";
import {WrapperSet} from "../../utils/collection/WrapperSet.ts";

export class Suggestions {
    private static readonly EMPTY = new Suggestions(StringRange.at(0), []);

    private readonly range: StringRange;
    private readonly suggestions: Suggestion[];

    public constructor(range: StringRange, suggestions: Suggestion[]) {
        this.range = range;
        this.suggestions = suggestions;
    }

    public static empty(): Promise<Suggestions> {
        return Promise.resolve(this.EMPTY);
    }

    public static merge(command: string, input: Suggestions[]): Suggestions {
        if (input.length === 0) return this.EMPTY;
        if (input.length === 1) return input[0];

        const texts = new WrapperSet<Suggestion>(input.values().flatMap(s => s.collect()));
        return this.create(command, texts);
    }

    public static create(command: string, suggestions: Set<Suggestion> | Suggestion[]): Suggestions {
        if (Array.isArray(suggestions)) {
            if (suggestions.length === 0) return this.EMPTY;
        } else {
            if (suggestions.size === 0) return this.EMPTY;
        }

        let start = MAX_INT;
        let end = MIN_INT;
        for (const suggestion of suggestions) {
            const range = suggestion.getRange();
            start = Math.min(range.getStart(), start);
            end = Math.max(range.getEnd(), end);
        }

        const range = new StringRange(start, end);
        const texts = new WrapperSet<Suggestion>();
        for (const suggestion of suggestions) {
            texts.add(suggestion.expend(command, range));
        }

        const sorted: Suggestion[] = Array.from(texts);
        sorted.sort((a, b) => a.compareToIgnoreCase(b));
        return new Suggestions(range, sorted);
    }

    public getRange(): StringRange {
        return this.range;
    }

    public collect(): readonly Suggestion[] {
        return this.suggestions;
    }

    public toString(): string {
        return `Suggestions {range=${this.range}, suggestions=${this.suggestions}}`;
    }
}