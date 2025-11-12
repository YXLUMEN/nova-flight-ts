import {StringRange} from "../StringRange.ts";
import type {Suggestion} from "./Suggestion.ts";

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
        if (input.length === 0) {
            return this.EMPTY;
        }
        if (input.length === 1) {
            return input[0];
        }

        const texts = new Set<Suggestion>();
        for (const suggestions of input) {
            suggestions.getList().forEach(suggestion => texts.add(suggestion));
        }

        return this.create(command, texts);
    }

    public static create(command: string, suggestions: Set<Suggestion>): Suggestions {
        if (suggestions.size === 0) {
            return this.EMPTY;
        }

        let start = Number.MAX_SAFE_INTEGER;
        let end = Number.MIN_SAFE_INTEGER;
        for (const suggestion of suggestions) {
            start = Math.min(suggestion.getRange().getStart(), start);
            end = Math.max(suggestion.getRange().getEnd(), end);
        }

        const range = new StringRange(start, end);
        const texts = new Set<Suggestion>();
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

    public getList(): Suggestion[] {
        return this.suggestions;
    }

    public toString(): string {
        return `Suggestions {range=${this.range}, suggestions=${this.suggestions}}`;
    }
}