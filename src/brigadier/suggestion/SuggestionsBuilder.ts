import {Suggestion} from "./Suggestion.ts";
import {Suggestions} from "./Suggestions.ts";
import {StringRange} from "../context/StringRange.ts";

export class SuggestionsBuilder {
    public readonly input: string;
    public readonly inputLowerCase: string;
    public readonly start: number;
    public readonly remaining: string;
    public readonly remainingLowerCase: string;
    private readonly result: Suggestion[] = [];

    public constructor(input: string, inputLowerCase: string, start: number) {
        this.input = input;
        this.inputLowerCase = inputLowerCase;
        this.start = start;
        this.remaining = input.substring(start);
        this.remainingLowerCase = inputLowerCase.substring(start);
    }

    public build() {
        return Suggestions.create(this.input, new Set(this.result));
    }

    public async buildPromise() {
        return this.build();
    }

    public suggest(text: string) {
        if (text === this.remaining) {
            return this;
        }
        this.result.push(new Suggestion(StringRange.between(this.start, this.input.length), text));
        return this;
    }

    public suggestTooltip(text: string, tooltip: string) {
        if (text === this.remaining) {
            return this;
        }
        this.result.push(new Suggestion(StringRange.between(this.start, this.input.length), text, tooltip));
        return this;
    }

    public add(other: SuggestionsBuilder) {
        other.result.forEach(suggestion => this.result.push(suggestion));
        return this;
    }

    public createOffset(start: number) {
        return new SuggestionsBuilder(this.input, this.inputLowerCase, start);
    }

    public restart() {
        return this.createOffset(this.start);
    }
}