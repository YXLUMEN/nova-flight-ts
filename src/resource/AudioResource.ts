import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import type {Identifier} from "../registry/Identifier.ts";
import {convertFileSrc} from "@tauri-apps/api/core";
import {join, resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {isRecord} from "../utils/util.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {Resources} from "./Resources.ts";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import {Log} from "../worker/log.ts";

export class AudioResource implements ResourceModule {
    public readonly buffers = new Map<Identifier, string>();

    public getId(): Identifier {
        return Resources.AUDIO;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const root = await resolveResource('resources/nova-flight');
        const audioRegister = manager.get(RegistryKeys.AUDIOS);
        const audios = audioRegister.getIdSet();

        const jsonPath = await join(root, 'audios.json');
        const record = JSON.parse(await readTextFile(jsonPath));
        if (!isRecord(record)) {
            Log.warn('[Client] No audios.json was found');
            return;
        }

        const pool = new PromisePool();
        for (const audioId of audios) {
            pool.spawn(this.parse, root, audioId, record, this.buffers);
        }
        await pool.join();
    }

    private async parse(
        root: string,
        audioId: Identifier,
        json: Record<string, Record<string, string>>,
        buffers: Map<Identifier, string>
    ) {
        try {
            const id = audioId.getPath();
            const entry = json[id];
            const audioEntry = entry['file'];

            if (!entry || !audioEntry) {
                Log.warn(`AudioID ${id} not found in audios.json`);
                return;
            }

            const audioPath = audioEntry.split(':').pop();
            if (!audioPath) return;

            const path = await join(root, '/audios', audioPath);
            buffers.set(audioId, convertFileSrc(path));
        } catch (err) {
            console.warn(audioId.toString(), err);
            Log.warn(`Error while parsing audio "${audioId}", cause by "${err}"`);
        }
    }

    public reload(manager: RegistryManager): Promise<void> {
        this.unload();
        return this.load(manager);
    }

    public unload(): void {
        this.buffers.clear();
    }
}