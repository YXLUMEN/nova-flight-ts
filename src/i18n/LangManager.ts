import type {LangModule} from "../resource/LangModule.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";

export class LangManager {
    private static cache: LangModule | null = null;

    private static get module(): LangModule {
        if (!this.cache) this.cache = ResourceManager.get<LangModule>(Resources.LANG);
        return this.cache;
    }

    public static getText(key: string): string | undefined {
        return this.module.data.get(key);
    }

    public static changeLang(lang: string): Promise<void> {
        return this.module.setLang(lang);
    }

    public static getCurrentLang(): string {
        return this.module.getCurrentLang();
    }
}
