import type {OptionStorage} from "../../database/settings/OptionStorage.ts";
import {WorkerFs} from "../../worker/WorkerFs.ts";
import {Log} from "../../utils/Log.ts";

export class ServerOptionStorage implements OptionStorage {
    private readonly path: string;

    public constructor(path: string) {
        this.path = path
    }

    public async load(): Promise<string | null> {
        try {
            const buffer = await WorkerFs.readFile(this.path);
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
            WorkerFs.writeFile(this.path, buffer.buffer);
        } catch (err) {
            Log.error(err);
        }

        return Promise.resolve();
    }
}