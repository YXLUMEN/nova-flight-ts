import type {LangResource} from "../client/resource/LangResource.ts";
import {ResourceManager} from "../client/resource/ResourceManager.ts";
import {Resources} from "../client/resource/Resources.ts";

export class LangManager {
    private static resource: LangResource | null = null;

    private static get module(): LangResource {
        if (!this.resource) this.resource = ResourceManager.get<LangResource>(Resources.LANG);
        return this.resource;
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
