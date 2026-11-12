import type {ResourceModule} from "./ResourceModule.ts";
import type {Identifier} from "../registry/Identifier.ts";
import type {SettingGuard} from "../database/settings/SettingGuard.ts";
import {type DirEntry, exists, readDir, readTextFile} from "@tauri-apps/plugin-fs";
import {join, resolveResource} from "@tauri-apps/api/path";
import {traverse_dir} from "../client/ipc/fs.ts";
import {pruneSuffix} from "../utils/path.ts";
import {appEvent} from "../event/EventBus.ts";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import {Resources} from "./Resources.ts";
import {Settings} from "../client/settings/Settings.ts";
import {Result} from "../utils/result/Result.ts";
import {CallTwice} from "../type/errors.ts";
import {LangChange} from "../event/events/ui/LangChange.ts";
import {Log} from "../worker/log.ts";

export class LangResource implements ResourceModule, SettingGuard<string> {
    private readonly allLang: string[] = [];
    private data: Map<string, string> = new Map();

    private pending: boolean = false;

    public constructor() {
        Settings.LANG.setGuard(this);
    }

    public getId(): Identifier {
        return Resources.LANG;
    }

    public load(): Promise<void> {
        return this.loadLang(Settings.LANG.get());
    }

    public async changeLang(lang: string): Promise<Result<string, Error>> {
        if (lang === Settings.LANG.get()) return Result.ok(lang);
        if (this.pending) return Result.err(new CallTwice('Task running'));
        this.pending = true;

        try {
            await this.loadLang(lang);
            const result = Settings.LANG.force(lang);
            appEvent.emit(new LangChange(lang));
            return result;
        } catch (err) {
            return Result.err(Result.mapErr(err));
        } finally {
            this.pending = false;
        }
    }

    private async loadLang(lang: string): Promise<void> {
        const root = await resolveResource('resources/nova-flight/langs');

        this.allLang.length = 0;
        await traverse_dir(root, (_, entry) => {
            if (entry.isDirectory) this.allLang.push(entry.name);
        }, 1);

        if (!this.allLang.includes(lang)) {
            throw new Error(`Lang ${lang} not found`);
        }

        const targetRoot = await join(root, lang);
        if (!await exists(targetRoot)) {
            throw new Error(`Lang ${lang} not found`);
        }

        const files: DirEntry[] = [];
        try {
            const dirs = await readDir(targetRoot);
            for (const entry of dirs) {
                if (entry.isFile) files.push(entry);
            }
        } catch (err) {
            Log.warn(`[Client] Error while traverse directory ${targetRoot}, because: ${err}`);
        }

        if (files.length === 0) return;

        const pool = new PromisePool<[string, unknown][]>(16);
        for (const file of files) {
            pool.spawn(this.loadFile, targetRoot, file);
        }

        const results = await pool.join();
        const map = new Map();
        for (const result of results) {
            if (result.status === 'rejected') {
                Log.warn(`[Client] Error while load ${lang}: ${result.reason}`);
                continue;
            }

            const entries = result.value;
            if (!Array.isArray(entries)) {
                Log.warn(`[Client] Lang entry not array.`);
                continue;
            }

            for (const [key, value] of entries) {
                if (typeof value !== 'string') {
                    Log.warn(`[Client] Invalid value ${value} in ${lang}`);
                    continue;
                }
                map.set(key, value);
            }
        }
        this.data = map;
    }

    private async loadFile(root: string, file: DirEntry) {
        const path = await join(root, file.name);
        const raw = await readTextFile(path);
        const json: unknown = JSON.parse(raw);

        if (typeof json !== 'object' || json == null) {
            throw new TypeError('Invalid lang formate');
        }

        const entries = Object.entries(json);
        const name = pruneSuffix(file.name);
        for (const entry of entries) {
            entry[0] = `${name}.${entry[0]}`;
        }
        return entries;
    }

    public unload(): void {
        this.allLang.length = 0;
        this.data.clear();
        Settings.LANG.setGuard(null);
    }

    public reload(): Promise<void> {
        this.unload();
        Settings.LANG.setGuard(this);
        return this.load();
    }

    public currentLang() {
        // Manager 不能直接引用 Settings, 否则会出现提前引用
        return Settings.LANG.get();
    }

    public getText(key: string): string | undefined {
        return this.data.get(key);
    }

    public getAllLang(): ReadonlyArray<string> {
        return this.allLang;
    }

    public accept(value: string): Promise<Result<string, Error>> {
        return this.changeLang(value);
    }

    public unbind(): void {
    }
}
