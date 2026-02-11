import {resolve, resolveResource} from "@tauri-apps/api/path";
import {exists, readDir, readTextFile} from "@tauri-apps/plugin-fs";
import {warn} from "@tauri-apps/plugin-log";
import {PromisePool} from "../utils/collection/PromisePool.ts";

export class LangManager {
    public static readonly DEFAULT_LANG: string = 'en_us';

    private static currentLang: string = 'en_us';
    private static readonly loadedLang = new Map<string, string>();

    public static getText(key: string) {
        return this.loadedLang.get(key);
    }

    public static async loadLang(lang: string) {
        const root = await resolveResource(`resources/nova-flight/langs/${lang}`);
        if (!await exists(root)) return;

        const files: LangFile[] = [];
        try {
            const dirs = await readDir(root);
            for (const entry of dirs) {
                if (entry.isFile) files.push({
                    path: await resolve(root, entry.name),
                    filename: entry.name,
                });
            }
        } catch (err) {
            console.error(err);
            await warn(`[Client] Error while recursive directory ${root}`);
        }

        if (files.length === 0) return;

        const pool = new PromisePool();
        const loadTasks: Promise<[string, unknown][]>[] = [];

        for (const file of files) {
            loadTasks.push(pool.submit(async () => {
                const raw = await readTextFile(file.path);
                const json = JSON.parse(raw);

                const entries = Object.entries(json);
                const resolves: [string, unknown][] = [];
                const i = file.filename.lastIndexOf('.');
                const name = i < 0 ? file.filename : file.filename.substring(0, i);

                for (const entry of entries) {
                    entry[0] = `${name}.${entry[0]}`;
                    resolves.push(entry);
                }
                return resolves;
            }));
        }

        const results = await Promise.allSettled(loadTasks);

        this.loadedLang.clear();
        this.currentLang = lang;

        for (const result of results) {
            if (result.status === 'rejected') {
                await warn(`[Client] Error while load ${lang}: ${result.reason}`);
                continue;
            }

            const entries = result.value;
            if (!Array.isArray(entries)) {
                console.warn(`Lang entry not array.`);
                continue;
            }

            for (const [key, value] of entries) {
                if (typeof value !== 'string') {
                    console.warn(`Invalid value ${value} in ${lang}`);
                    continue;
                }
                this.loadedLang.set(key, value);
            }
        }
    }

    public static getCurrentLangName() {
        return this.currentLang;
    }
}

type LangFile = { path: string, filename: string };