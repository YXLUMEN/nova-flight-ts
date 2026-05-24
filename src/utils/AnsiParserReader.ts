import {config} from "./uit.ts";
import {StringReader} from "../brigadier/StringReader.ts";

export class AnsiParser {
    private static readonly ESC = '\x1b';
    private static readonly RESET_CODE = '0';
    private static readonly COLOR_MAP: Record<string, string> = config({
        '30': 'black',
        '31': 'red',
        '32': 'green',
        '33': 'yellow',
        '34': 'blue',
        '35': 'magenta',
        '36': 'cyan',
        '37': 'white',
        '90': 'gray'
    });

    public static parseToElement(msg: string): HTMLDivElement {
        return this.parseFromReader(new StringReader(msg));
    }

    public static parseFromReader(reader: StringReader): HTMLDivElement {
        const container = document.createElement('div');
        let color: string | null = null;
        let textStart = reader.getCursor();

        while (reader.canRead()) {
            if (reader.peek() !== this.ESC) {
                reader.skip();
                continue;
            }

            textStart = this.flushText(reader, textStart, color, container);
            color = this.tryParseSequence(reader, color);
            textStart = reader.getCursor();
        }

        this.flushText(reader, textStart, color, container);
        return container;
    }

    private static tryParseSequence(reader: StringReader, currentColor: string | null): string | null {
        const rollback = reader.getCursor();
        reader.skip();

        if (!reader.canRead() || reader.read() !== '[') {
            reader.setCursor(rollback);
            reader.read();
            return currentColor;
        }

        let digits = '';
        while (reader.canRead()) {
            const ch = reader.peek();
            if (ch >= '0' && ch <= '9') {
                digits += reader.read();
            } else {
                break;
            }
        }

        if (digits.length === 0 || !reader.canRead() || reader.read() !== 'm') {
            reader.setCursor(rollback);
            reader.read();
            return currentColor;
        }

        if (digits === this.RESET_CODE) return null;
        return this.COLOR_MAP[digits] ?? currentColor;
    }

    private static flushText(
        reader: StringReader,
        start: number,
        color: string | null,
        container: HTMLDivElement,
    ): number {
        const end = reader.getCursor();
        if (end > start) {
            const text = reader.getString().slice(start, end);
            container.appendChild(this.createSpan(text, color));
        }
        return end;
    }

    private static createSpan(text: string, color: string | null): HTMLSpanElement {
        const span = document.createElement('span');
        span.textContent = text;
        if (color) span.style.color = color;
        return span;
    }
}
