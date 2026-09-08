import {resolveResource} from "@tauri-apps/api/path";
import {exists, readTextFile, writeTextFile} from "@tauri-apps/plugin-fs";
import {error} from "@tauri-apps/plugin-log";

export class OptionStorage {
    private readonly path: string;

    public constructor(path: string) {
        this.path = path;
    }

    public async load(): Promise<string | null> {
        const path = await resolveResource(this.path);
        if (!await exists(path)) return null;

        try {
            return await readTextFile(path);
        } catch (err) {
            await error('[Client] Can not load settings');
            return null;
        }
    }

    public async save(json: string) {
        try {
            const path = await resolveResource(this.path);
            await writeTextFile(path, json, {
                create: true
            });
        } catch (err) {
            await error('[Client] Fail to save settings');
        }
    }
}