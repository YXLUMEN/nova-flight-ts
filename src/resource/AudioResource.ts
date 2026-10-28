import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import type {Identifier} from "../registry/Identifier.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {warn} from "@tauri-apps/plugin-log";
import {convertFileSrc} from "@tauri-apps/api/core";
import {join, resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {Resources} from "./Resources.ts";
import {PromisePool} from "../utils/collection/PromisePool.ts";


export class AudioResource implements ResourceModule {
    public readonly buffers = new Map<Identifier, string>();

    public getId(): RegistryEntry<string> {
        return Resources.AUDIO;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const root = 'resources/nova-flight';
        const audioRegister = manager.get(RegistryKeys.AUDIOS);
        const audios = audioRegister.getIdSet();

        const jsonPath = await join(root, 'audios.json');
        const resolved = await resolveResource(jsonPath);
        const json = JSON.parse(await readTextFile(resolved));

        const pool = new PromisePool();
        for (const audioId of audios) {
            pool.spawn(this.parse, root, audioId, json, this.buffers);
        }
        await pool.join();
    }

    private async parse(root: string, audioId: Identifier, json: any, buffers: Map<Identifier, string>) {
        try {
            const id = audioId.getPath();
            const entry = json[id];
            const audioEntry = entry['file'];

            if (!entry || !audioEntry) {
                await warn(`AudioID ${id} not found in audios.json`);
                return;
            }

            const audioPath = audioEntry.split(':').pop();
            if (!audioPath) return;

            const path = await join(root, '/audios', audioPath);
            const resolved = await resolveResource(path);
            buffers.set(audioId, convertFileSrc(resolved));
        } catch (err) {
            console.warn(audioId.toString(), err);
            await warn(`Error while parsing audio "${audioId}", cause by "${err}"`);
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