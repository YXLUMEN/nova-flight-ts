export class StringReader {
    private readonly string: string;
    private cursor: number;

    public constructor(text: string, cursor: number = 0) {
        this.string = text;
        this.cursor = cursor;
    }

    public static fromReader(reader: StringReader): StringReader {
        return new StringReader(reader.string, reader.cursor);
    }

    public getString(): string {
        return this.string;
    }

    public setCursor(cursor: number): void {
        this.cursor = cursor;
    }

    public getRemainingLength(): number {
        return this.string.length - this.cursor;
    }

    public getTotalLength(): number {
        return this.string.length;
    }

    public getCursor(): number {
        return this.cursor;
    }

    public getRead(): string {
        return this.string.substring(0, this.cursor);
    }

    public getRemaining(): string {
        return this.string.substring(this.cursor);
    }

    public canRead(length: number = 1): boolean {
        return this.cursor + length <= this.string.length;
    }

    public peek(offset: number = 0): string {
        return this.string.charAt(this.cursor + offset);
    }

    public read(): string {
        return this.string.charAt(this.cursor++);
    }

    public skip(): void {
        this.cursor++;
    }

    public static isAllowedNumber(c: string): boolean {
        const code = c.charCodeAt(0);
        return (code >= 48 && code <= 57) // '0'..'9'
            || c === '.'
            || c === '-';
    }

    public static isAllowedInUnquotedString(c: string) {
        return /^[0-9A-Za-z_\-.+:]$/.test(c);
    }

    public static isQuotedStringStart(c: string): boolean {
        return c === '"' || c === "'";
    }

    public skipWhitespace() {
        while (this.canRead() && this.peek() === ' ') {
            this.skip();
        }
    }

    public readUnquotedString(): string {
        const start = this.cursor;
        while (this.canRead() && StringReader.isAllowedInUnquotedString(this.peek())) {
            this.skip();
        }

        return this.string.substring(start, this.cursor);
    }

    public readQuotedString(): string {
        if (!this.canRead()) return '';

        const next = this.peek();
        if (!StringReader.isQuotedStringStart(next)) {
            throw new Error("Char is not quoted");
        }

        this.skip();
        return this.readStringUntil(next);
    }

    public readStringUntil(terminator: string): string {
        const result: string[] = [];
        let escaped = false;

        while (this.canRead()) {
            const char = this.read();
            if (escaped) {
                if (char === terminator || char === '\\') {
                    result.push(char);
                    escaped = false;
                } else {
                    this.setCursor(this.getCursor() - 1);
                    throw new Error("Reader Invalid escape");
                }
            } else if (char === '\\') {
                escaped = true;
            } else if (char === terminator) {
                return result.join('');
            } else {
                result.push(char);
            }
        }

        throw new Error("Reader Expected end of quote");
    }

    public readString(): string {
        if (!this.canRead()) return '';

        const next = this.peek();
        if (StringReader.isQuotedStringStart(next)) {
            this.skip();
            return this.readStringUntil(next);
        }

        return this.readUnquotedString();
    }
}