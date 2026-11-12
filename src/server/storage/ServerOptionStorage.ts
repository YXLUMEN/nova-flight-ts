import type {OptionStorage} from "../../database/settings/OptionStorage.ts";
import {WorkerFS} from "../../worker/fs.ts";
import {Log} from "../../worker/log.ts";

export class ServerOptionStorage implements OptionStorage {
    private readonly path: string;

    public constructor(path: string) {
        this.path = path
    }

    public async load(): Promise<string | null> {
        try {
            const buffer = await WorkerFS.readFile(this.path);
            if (!buffer) return null;
            return new TextDecoder('utf-8', {fatal: true}).decode(buffer);
        } catch (err) {
            Log.error(err);
            return null;
        }
    }

    public save(json: string): Promise<void> {
        try {
            const buffer = new TextEncoder().encode(json);
            WorkerFS.writeFile(this.path, buffer.buffer);
        } catch (err) {
            Log.error(err);
        }

        return Promise.resolve();
    }
}