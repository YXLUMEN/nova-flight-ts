import {config} from "./uit.ts";

export class AnsiParser {
    private static REGEX: RegExp = /\x1b\[(\d+)m/g;
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
        const container = document.createElement('div');

        let lastIndex = 0;
        let currentColor: string | null = null;

        let match: RegExpExecArray | null;
        while ((match = this.REGEX.exec(msg)) !== null) {
            // 添加前一段普通文本
            if (match.index > lastIndex) {
                const text = msg.slice(lastIndex, match.index);
                container.appendChild(this.createSpan(text, currentColor));
            }

            const code = match[1];
            // 重置
            currentColor = code === '0' ? null : this.COLOR_MAP[code] ?? null;
            lastIndex = this.REGEX.lastIndex;
        }

        // 添加最后一段文本
        if (lastIndex < msg.length) {
            const text = msg.slice(lastIndex);
            container.appendChild(this.createSpan(text, currentColor));
        }

        return container;
    }

    private static createSpan(text: string, color: string | null): HTMLSpanElement {
        const span = document.createElement('span');
        span.textContent = text;
        if (color) span.style.color = color;
        return span;
    }
}
