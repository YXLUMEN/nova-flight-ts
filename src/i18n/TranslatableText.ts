import {LangManager} from "./LangManager.ts";
import {IllegalArgumentError} from "../apis/errors.ts";

export class TranslatableText {
    public static readonly ESCAPED_LEFT = '__ESCAPED_LEFT__';
    public static readonly ESCAPED_RIGHT = '__ESCAPED_RIGHT__';

    private readonly key: string;
    private readonly args: string[] | null;

    public constructor(key: string, args: string[] | null = null) {
        this.key = key;
        this.args = args;
    }

    private format(template: string): string {
        // 将 \{ 和 \} 替换为唯一标记
        let processed = template
            .replace(/\\\{/g, TranslatableText.ESCAPED_LEFT)
            .replace(/\\}/g, TranslatableText.ESCAPED_RIGHT);

        // 匹配所有合法占位符
        const placeholderRegex = /\{(?::\?)?}|\{(\d+)}/g;
        const matches: Array<{
            match: string;
            index: number;
            type: 'seq' | 'debug' | 'indexed';
            argIndex?: number
        }> = [];
        let match: RegExpExecArray | null;

        while ((match = placeholderRegex.exec(processed)) !== null) {
            const full = match[0];
            if (full === '{}') {
                matches.push({match: full, index: match.index, type: 'seq'});
            } else if (full === '{:?}') {
                matches.push({match: full, index: match.index, type: 'debug'});
            } else if (match[1] !== undefined) {
                const idx = Number(match[1]);
                if (!Number.isSafeInteger(idx) || idx < 0) {
                    throw new IllegalArgumentError(
                        `Invalid indexed placeholder: '${match[0]}'.
                         Index must be a non-negative integer (e.g., {0}, {1}). Got: '${match[1]}'`
                    );
                }
                matches.push({match: full, index: match.index, type: 'indexed', argIndex: idx});
            }
        }

        // 检查嵌套花括号
        const illegalNested = /(?<!\\)\{[^{}]*\{[^{}]*}/g;
        if (illegalNested.test(template)) {
            console.error(`Nested placeholders are not allowed in: "${template}"`);
            throw new Error('Nested placeholders detected. Use \\{ to escape.');
        }

        const args = this.args ?? [];
        let seqIndex = 0;
        let result = processed;

        // 从右到左替换,避免索引偏移
        for (let i = matches.length - 1; i >= 0; i--) {
            const m = matches[i];
            let replacement: string;

            if (m.type === 'indexed') {
                const idx = m.argIndex!;
                if (idx < args.length) {
                    replacement = String(args[idx]);
                } else {
                    replacement = `[Arg${idx}]`;
                    console.assert(false, `Missing argument at index ${idx} for placeholder {${idx}}`);
                }
            } else {
                // 'seq' or 'debug'
                if (seqIndex < args.length) {
                    const arg = args[seqIndex];
                    if (m.type === 'debug') {
                        try {
                            replacement = JSON.stringify(arg);
                        } catch {
                            replacement = String(arg);
                        }
                    } else {
                        replacement = String(arg);
                    }
                    seqIndex++;
                } else {
                    // 参数不足
                    const placeholderType = m.type === 'debug' ? '{:?}' : '{}';
                    replacement = `[Arg${seqIndex}]`;
                    console.assert(false, `Not enough arguments for placeholder ${placeholderType}. Expected at least ${seqIndex + 1}, got ${args.length}`);
                }
            }

            // 执行替换(从右往左)
            result = result.substring(0, m.index) + replacement + result.substring(m.index + m.match.length);
        }

        // 恢复转义
        result = result
            .replace(new RegExp(TranslatableText.ESCAPED_LEFT, 'g'), '{')
            .replace(new RegExp(TranslatableText.ESCAPED_RIGHT, 'g'), '}');

        //检查多余参数
        if (args.length > seqIndex + matches.filter(m => m.type === 'indexed').length) {
            // indexed 参数不消耗 seqIndex 所以总使用量 = seqIndex + indexed unique count
            const usedIndexed = new Set(matches
                .filter(m => m.type === 'indexed')
                .map(m => m.argIndex!)
            );

            const totalUsed = seqIndex + usedIndexed.size;
            if (args.length > totalUsed) {
                console.assert(false, `More arguments provided (${args.length}) than placeholders used (${totalUsed})`);
            }
        }

        return result;
    }

    public toString() {
        const key = LangManager.getText(this.key);
        if (key === null) return key;
        return this.format(key);
    }
}