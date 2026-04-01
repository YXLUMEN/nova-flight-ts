import type {RegistryManager} from "../registry/RegistryManager.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {type DirEntry, readDir, readFile} from "@tauri-apps/plugin-fs";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {error} from "@tauri-apps/plugin-log";
import {RegistryKeys} from "../registry/RegistryKeys.ts";
import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {Item} from "../item/Item.ts";
import {Resources} from "./Resources.ts";

export class TextureResource implements ResourceModule {
    private readonly data = new Map<RegistryEntry<Item>, ImageBitmap>();
    private defaultTexture: ImageBitmap | null = null;

    public getId(): RegistryEntry<string> {
        return Resources.TEXTURE;
    }

    public async load(manager: RegistryManager): Promise<void> {
        const root = await resolveResource(`resources/nova-flight/texture`);
        if (!this.defaultTexture) {
            const path = await resolve(root, 'default.png');
            const buffer = await readFile(path);
            const blob = new Blob([buffer], {type: 'image/png'});
            this.defaultTexture = await createImageBitmap(blob);
        }

        const itemRoot = await resolve(root, 'items');
        const files = new Map<string, DirEntry>();
        try {
            const dirs = await readDir(itemRoot);
            for (const file of dirs) {
                if (!file.isFile) continue;
                const i = file.name.lastIndexOf('.');
                const name = i < 0 ? file.name : file.name.substring(0, i);
                files.set(name, file);
            }
        } catch (e) {
            await error(`[Client] Error while recursive directory ${itemRoot}`);
            return;
        }

        if (files.size === 0) return;

        const itemRegistry = manager.get(RegistryKeys.ITEM);
        const items = itemRegistry.getIds();

        for (const item of items) {
            const registryName = item.getPath();
            if (!files.has(registryName)) continue;

            const entry = itemRegistry.getEntryById(item);
            if (!entry) continue;

            const path = await resolve(itemRoot, files.get(registryName)!.name);
            const buffer = await readFile(path);
            const blob = new Blob([buffer], {type: 'image/png'});
            const img = await createImageBitmap(blob);

            this.data.set(entry, img);
        }
    }

    public reload(manager: RegistryManager): Promise<void> {
        this.unload();
        return this.load(manager);
    }

    public unload(): void {
        for (const img of this.data.values()) {
            img.close();
        }
        this.data.clear();
    }

    public get(entry: RegistryEntry<Item>): ImageBitmap {
        return this.data.get(entry) ?? this.defaultTexture!;
    }
}