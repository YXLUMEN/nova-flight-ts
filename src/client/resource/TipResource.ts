import type {ResourceModule} from "./ResourceModule.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {error, warn} from "@tauri-apps/plugin-log";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";

export class TipResource implements ResourceModule {
    public tips: TranslatableText[] = [];

    public getId(): RegistryEntry<string> {
        return Resources.TIP;
    }

    public async load(): Promise<void> {
        try {
            const jsonPath = await resolveResource(`resources/nova-flight/tips.json`);
            const json = JSON.parse(await readTextFile(jsonPath));
            if (!Array.isArray(json) || !json.every(item => typeof item === "string")) {
                await warn('Wrong syntax with tips.json');
                return;
            }

            this.tips = json.length === 0 ?
                [TranslatableText.of('')] :
                json.map(item => TranslatableText.of(`tips.${item}`));
        } catch (e) {
            await error(`Could not load tips.json: ${e}`);
        }
    }

    public reload(): Promise<void> {
        return this.load();
    }

    public unload(): void {
        this.tips.length = 0;
    }
}