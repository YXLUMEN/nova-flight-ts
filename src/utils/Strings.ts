export function commonPrefix(a: string, b: string): string {
    const minLen = Math.min(a.length, b.length);
    let i = 0;
    while (i < minLen && a.charAt(i) === b.charAt(i)) {
        i++;
    }
    return a.substring(0, i);
}

export function commonPrefixAll(strings: string[]): string {
    if (strings.length === 0) return "";
    let prefix = strings[0];
    for (let i = 1; i < strings.length; i++) {
        prefix = commonPrefix(prefix, strings[i]);
        if (prefix === "") break;
    }
    return prefix;
}

export function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.trim().length > 0;
}

export function isAscii(str: string): boolean {
    for (let i = 0; i < str.length; i++) {
        if (str.charCodeAt(i) > 0x7F) return false;
    }
    return true;
}