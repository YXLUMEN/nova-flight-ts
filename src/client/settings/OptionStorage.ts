import {appLocalDataDir, join} from "@tauri-apps/api/path";
import {exists, mkdir, readTextFile, remove, rename, writeTextFile} from "@tauri-apps/plugin-fs";
import {error} from "@tauri-apps/plugin-log";
import {shortUUID} from "../../utils/math/math.ts";

export class OptionStorage {
    private readonly dir: string;
    private readonly name: string;

    private resolved: string | null = null;

    public constructor(dir: string, name: string) {
        this.dir = dir;
        this.name = name;
    }

    public async load(): Promise<string | null> {
        const path = await this.configPath();
        if (!await exists(path)) return null;

        try {
            return readTextFile(path);
        } catch (err) {
            this.resolved = null;
            await error(`[Settings] Can not load settings. Cause by: ${err}`);
            return null;
        }
    }

    public async save(json: string): Promise<void> {
        const path = await this.configPath();
        const temp = `${path}.${shortUUID(8)}-temp`;

        try {
            await writeTextFile(temp, json, {create: true});
            await rename(temp, path);
        } catch (err) {
            this.resolved = null;
            await error('[Settings] Fail to save settings');
            await remove(temp)
                .catch(err => error(`[Settings] Error occur when remove temp file. Cause by: ${err}`));
        }
    }

    private async configPath(): Promise<string> {
        if (this.resolved) return this.resolved;

        const root = await appLocalDataDir();
        const dir = await join(root, this.dir);
        await mkdir(dir, {recursive: true});

        this.resolved = await join(dir, this.name);
        return this.resolved;
    }
}