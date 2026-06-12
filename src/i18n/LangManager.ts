import type {LangResource} from "../resource/LangResource.ts";
import {ResourceManager} from "../resource/ResourceManager.ts";
import {Resources} from "../resource/Resources.ts";

export class LangManager {
    private static resource: LangResource | null = null;

    private static get module(): LangResource {
        if (!this.resource) this.resource = ResourceManager.get<LangResource>(Resources.LANG);
        return this.resource;
    }

    public static getText(key: string): string | undefined {
        return this.module.getText(key);
    }

    public static changeLang(lang: string): Promise<void> {
        return this.module.setLang(lang);
    }

    public static getCurrentLang(): string {
        return this.module.getCurrentLang();
    }

    public static getAllLang(): ReadonlyArray<string> {
        return this.module.getAllLang();
    }
}
