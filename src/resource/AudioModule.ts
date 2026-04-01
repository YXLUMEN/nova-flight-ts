import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import {resolveResource} from "@tauri-apps/api/path";
import {readTextFile} from "@tauri-apps/plugin-fs";
import type {Identifier} from "../registry/Identifier.ts";
import {convertFileSrc} from "@tauri-apps/api/core";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";

export class AudioModule implements ResourceModule {
    public readonly buffers = new Map<Identifier, string>();

    public getId(): RegistryEntry<string> {
        return Resources.AUDIO;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const audioRegister = manager.get(RegistryKeys.AUDIOS);
        const audios = audioRegister.getIdSet();

        const jsonPath = await resolveResource(`resources/nova-flight/audios.json`);
        const json = JSON.parse(await readTextFile(jsonPath));

        for (const audioId of audios) {
            try {
                const id = audioId.getPath();
                const entry = json[id];
                const audioEntry = entry['file'];

                if (!entry || !audioEntry) {
                    console.warn(`AudioID ${id} not found in audios.json`);
                    continue;
                }

                const audioPath = audioEntry.split(':').pop();
                if (!audioPath) continue;

                const url = await resolveResource(`resources/nova-flight/audios${audioPath}`);
                this.buffers.set(audioId, convertFileSrc(url));
            } catch (err) {
                console.warn(err, audioId);
            }
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