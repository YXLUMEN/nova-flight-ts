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