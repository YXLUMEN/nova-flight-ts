import {LangManager} from "./LangManager.ts";
import {StringReader} from "../brigadier/StringReader.ts";

export class TranslatableText {
    private ordered: string = '';
    private lang: string = '';

    private readonly key: string;
    private readonly args: string[] | null;

    public constructor(key: string, args: string[] | null) {
        this.key = key;
        this.args = args;
    }

    public static of(key: string): TranslatableText {
        return new TranslatableText(key, null);
    }

    public getKey(): string {
        return this.key;
    }

    private format(template: string): string {
        if (!this.args) return template;

        const reader = new StringReader(template);
        const parts: string[] = [];
        let argIndex = 0;

        while (reader.canRead()) {
            const char = reader.peek();
            if (char !== '{') {
                if (char === '}') {
                    throw new SyntaxError('Single placeholder detected. Use \\} to escape');
                }

                // 跳过转义符
                if (char === '\\') {
                    reader.skip();
                }

                parts.push(reader.read());
                continue;
            }

            reader.skip();
            if (reader.peek() === '{') {
                throw new SyntaxError('Nested placeholders detected. Use \\{ to escape.');
            }
            if (reader.peek() !== '}') {
                throw new SyntaxError('Unclose placeholder detected.');
            }
            reader.skip();

            parts.push(this.args[argIndex++] ?? '<missing>');
        }

        return parts.join('');
    }

    public toString(): string {
        const template = LangManager.getText(this.key);
        if (template === undefined) return this.key;
        if (!this.args) return template;
        return this.format(template);
    }

    public asString(): string {
        const lang = LangManager.getCurrentLang();
        if (this.lang !== lang) {
            this.ordered = this.toString();
            this.lang = lang;
        }
        return this.ordered;
    }
}