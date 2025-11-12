import type {StringRange} from "../StringRange.ts";

export class Suggestion {
    private readonly range: StringRange;
    private readonly text: string;
    private readonly tooltip: string | null;

    public constructor(range: StringRange, text: string, tooltip: string | null = null) {
        this.range = range;
        this.text = text;
        this.tooltip = tooltip;
    }

    public getRange() {
        return this.range;
    }

    public getText() {
        return this.text;
    }

    public getTooltip() {
        return this.tooltip;
    }

    public apply(input: string): string {
        if (this.range.getStart() === 0 && this.range.getEnd() === input.length) {
            return this.text;
        }

        const result: string[] = [];
        if (this.range.getStart() > 0) {
            result.push(input.substring(0, this.range.getStart()));
        }
        result.push(this.text);
        if (this.range.getEnd() < input.length) {
            result.push(input.substring(this.range.getEnd()));
        }

        return result.join('');
    }

    public expend(command: string, range: StringRange): Suggestion {
        if (range.equals(this.range)) {
            return this;
        }

        const result: string[] = [];
        if (range.getStart() < this.range.getStart()) {
            result.push(command.substring(range.getStart(), this.range.getStart()));
        }
        result.push(this.text);
        if (range.getEnd() > this.range.getEnd()) {
            result.push(command.substring(this.range.getEnd(), range.getEnd()));
        }

        return new Suggestion(range, result.join(''), this.tooltip);
    }

    public compareToIgnoreCase(b: Suggestion): number {
        return this.text.toLowerCase().localeCompare(b.text.toLowerCase());
    }
}