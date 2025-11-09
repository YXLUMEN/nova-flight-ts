export class AnsiParser {
    private static regex: RegExp = /\x1b\[(\d+)m/g;
    private static readonly colorMap: Record<string, string> = {
        '30': 'black',
        '31': 'red',
        '32': 'green',
        '33': 'yellow',
        '34': 'blue',
        '35': 'magenta',
        '36': 'cyan',
        '37': 'white',
        '90': 'gray'
    };

    public static parseToElement(msg: string): HTMLDivElement {
        const container = document.createElement('div');

        let lastIndex = 0;
        let currentColor: string | null = null;

        let match: RegExpExecArray | null;
        while ((match = this.regex.exec(msg)) !== null) {
            // 添加前一段普通文本
            if (match.index > lastIndex) {
                const text = msg.slice(lastIndex, match.index);
                container.appendChild(this.createSpan(text, currentColor));
            }

            const code = match[1];
            if (code === '0') {
                currentColor = null; // 重置
            } else {
                currentColor = this.colorMap[code] || null;
            }

            lastIndex = this.regex.lastIndex;
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
