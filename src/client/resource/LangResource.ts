import type {ResourceModule} from "./ResourceModule.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {type DirEntry, exists, readDir, readTextFile} from "@tauri-apps/plugin-fs";
import {warn} from "@tauri-apps/plugin-log";
import {PromisePool} from "../../utils/collection/PromisePool.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";

export class LangResource implements ResourceModule {
    public readonly data: Map<string, string> = new Map();

    private currentLang: string = 'zh_cn';

    public getId(): RegistryEntry<string> {
        return Resources.LANG;
    }

    public async load(): Promise<void> {
        const lang = this.currentLang;
        const root = await resolveResource(`resources/nova-flight/langs/${lang}`);

        if (!await exists(root)) {
            await warn(`Lang ${lang} not found`);
            return;
        }

        const files: DirEntry[] = [];
        try {
            const dirs = await readDir(root);
            for (const entry of dirs) {
                if (entry.isFile) files.push(entry);
            }
        } catch (err) {
            await warn(`[Client] Error while recursive directory ${root}, because: ${err}`);
        }

        if (files.length === 0) return;

        const pool = new PromisePool();
        const loadTasks: Promise<[string, unknown][]>[] = [];

        for (const file of files) {
            loadTasks.push(pool.submit(async () => {
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
            }));
        }

        const results = await Promise.allSettled(loadTasks);
        this.data.clear();

        for (const result of results) {
            if (result.status === 'rejected') {
                await warn(`[Client] Error while load ${lang}: ${result.reason}`);
                continue;
            }

            const entries = result.value;
            if (!Array.isArray(entries)) {
                await warn(`Lang entry not array.`);
                continue;
            }

            for (const [key, value] of entries) {
                if (typeof value !== 'string') {
                    await warn(`Invalid value ${value} in ${lang}`);
                    continue;
                }
                this.data.set(key, value);
            }
        }
    }

    public unload(): void {
        this.data.clear();
    }

    public reload(): Promise<void> {
        return this.load();
    }

    public setLang(lang: string): Promise<void> {
        if (this.currentLang === lang) return Promise.resolve();
        this.currentLang = lang;
        return this.reload();
    }

    public getCurrentLang(): string {
        return this.currentLang;
    }
}