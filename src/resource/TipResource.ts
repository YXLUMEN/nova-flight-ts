import type {ResourceModule} from "./ResourceModule.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {Resources} from "./Resources.ts";
import {TranslatableText} from "../i18n/TranslatableText.ts";
import {Log} from "../worker/log.ts";

export class TipResource implements ResourceModule {
    public tips: TranslatableText[] = [];

    public getId(): Identifier {
        return Resources.TIP;
    }

    public async load(): Promise<void> {
        try {
            const jsonPath = await resolveResource(`resources/nova-flight/tips.json`);
            const json: unknown = JSON.parse(await readTextFile(jsonPath));
            if (!Array.isArray(json)) {
                Log.warn('Wrong syntax with tips.json');
                return;
            }

            this.tips = json.length === 0 ?
                [TranslatableText.NONE] :
                json.map(item => TranslatableText.of(`tips.${item}`));
        } catch (e) {
            Log.error(`Could not load tips.json: ${e}`);
        }
    }

    public reload(): Promise<void> {
        return this.load();
    }

    public unload(): void {
        this.tips.length = 0;
    }
}