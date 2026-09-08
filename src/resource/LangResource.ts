import type {ResourceModule} from "./ResourceModule.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {type DirEntry, exists, readDir, readTextFile} from "@tauri-apps/plugin-fs";
import {warn} from "@tauri-apps/plugin-log";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";
import {traverse_dir} from "../utils/fs.ts";
import {Settings} from "../client/settings/Settings.ts";
import {Result} from "../utils/result/Result.ts";
import type {SettingGuard} from "../client/settings/SettingGuard.ts";
import {CallTwice} from "../type/errors.ts";

export class LangResource implements ResourceModule, SettingGuard<string> {
    private readonly allLang: string[] = [];
    private readonly data: Map<string, string> = new Map();

    private pending: boolean = false;

    public constructor() {
        Settings.LANG.setGuard(this);
    }

    public getId(): RegistryEntry<string> {
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
            return Settings.LANG.force(lang);
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

        const targetRoot = await resolve(root, lang);

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
            await warn(`[Client] Error while traverse directory ${targetRoot}, because: ${err}`);
        }

        if (files.length === 0) return;

        const pool = new PromisePool<[string, unknown][]>();
        for (const file of files) {
            pool.spawn(this.loadFile, targetRoot, file);
        }

        const results = await pool.join();
        this.data.clear();

        for (const result of results) {
            if (result.status === 'rejected') {
                await warn(`[Client] Error while load ${lang}: ${result.reason}`);
                continue;
            }

            const entries = result.value;
            if (!Array.isArray(entries)) {
                await warn(`[Client] Lang entry not array.`);
                continue;
            }

            for (const [key, value] of entries) {
                if (typeof value !== 'string') {
                    await warn(`[Client] Invalid value ${value} in ${lang}`);
                    continue;
                }
                this.data.set(key, value);
            }
        }
    }

    private async loadFile(root: string, file: DirEntry) {
        const path = await resolve(root, file.name);
        const raw = await readTextFile(path);
        const json = JSON.parse(raw);

        const entries = Object.entries(json);
        const resolves: [string, unknown][] = [];

        const i = file.name.lastIndexOf('.');
        const name = i < 0 ? file.name : file.name.substring(0, i);

        for (const entry of entries) {
            entry[0] = `${name}.${entry[0]}`;
            resolves.push(entry);
        }
        return resolves;
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
