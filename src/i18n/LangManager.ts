export class LangManager {
    public static readonly DEFAULT_LANG: string = 'en_us';
    public static currentLang: string = 'en_us';

    private static readonly loadedLang = new Map<string, string>();

    public static getText(key: string) {
        return this.loadedLang.get(key) ?? null;
    }
}