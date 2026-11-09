import type {SettingItem} from "./SettingItem.ts";
import type {OptionStorage} from "./OptionStorage.ts";
import {Log} from "../../worker/log.ts";

export class Options {
    private readonly version: number; // 仅破坏性变更时修改此值
    private readonly items: Map<string, SettingItem<unknown>> = new Map();
    private readonly storage: OptionStorage;
    private timer: number | undefined;

    public constructor(version: number, storage: OptionStorage) {
        this.version = version;
        this.storage = storage;
        this.save = this.save.bind(this);
    }

    public add<T>(item: SettingItem<T>): void {
        item.options = this;
        this.items.set(item.id.toString(), item as SettingItem<unknown>);
    }

    public scheduleSave(): void {
        clearTimeout(this.timer);
        this.timer = setTimeout(this.save, 3000);
    }

    public save(): Promise<void> {
        clearTimeout(this.timer);
        this.timer = undefined;
        return this.storage.save(this.toJson());
    }

    public flush() {
        return this.timer !== undefined ? this.save() : Promise.resolve();
    }

    public async load(): Promise<void> {
        const json = await this.storage.load();
        if (!json) return;

        try {
            this.fromJson(json);
        } catch (err) {
            Log.error(`[Settings] Invalid settings file, keep defaults. Cause by: ${err}`);
        }
    }

    public toJson(): string {
        const values: Record<string, unknown> = {};
        for (const [key, item] of this.items) {
            values[key] = item.get();
        }
        return JSON.stringify({version: this.version, values}, null, 2);
    }

    public fromJson(json: string): void {
        const parsed: any = JSON.parse(json);
        if (typeof parsed !== 'object' || parsed === null) return;

        const version: unknown = parsed.version;
        if (typeof version !== 'number' || version !== this.version) {
            Log.warn(`[Settings] Unmatch version "${version} but require "${this.version}"`);
            return;
        }

        const values = parsed.values as Record<string, unknown>;
        if (typeof values !== 'object' || values === null) return;

        for (const [key, item] of this.items) {
            const raw = values[key];
            if (raw === undefined) continue;   // 保持默认值
            item.restore(raw as never);
        }
    }
}