import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {Resources} from "./Resources.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {normalizedDir, traverse_dir} from "../../utils/fs.ts";
import {PromisePool} from "../../utils/collection/PromisePool.ts";
import {readTextFile} from "@tauri-apps/plugin-fs";
import type {TextureResource} from "./TextureResource.ts";
import {Model} from "../render/model/Model.ts";
import {ResourceManager} from "./ResourceManager.ts";
import type {DisplayConfig} from "../render/model/DisplayConfig.ts";

export class ModelResource implements ResourceModule {
    private readonly models: Map<string, Model> = new Map<string, Model>();
    private defaultModel: Model | null = null;
    private resource: TextureResource | null = null;

    public getId(): RegistryEntry<string> {
        return Resources.MODEL;
    }

    public async load(): Promise<void> {
        if (!this.resource) {
            this.resource = ResourceManager.get<TextureResource>(Resources.TEXTURE);
        }
        this.defaultModel = this.createModel('builtin/default');

        const root = await resolveResource(`resources/nova-flight`);

        const modelAbsPaths = new Map<string, string>();
        const modelDir = await resolve(root, 'models');

        await traverse_dir(modelDir, (absParent, entry) => {
            if (!entry.isFile || !entry.name.endsWith('.json')) return;

            const key = normalizedDir(modelDir, absParent, entry.name, 'nova-flight');
            const abs = `${absParent}\\${entry.name}`;
            modelAbsPaths.set(key, abs);
        });

        const pool = new PromisePool(16);
        const tasks: Promise<any>[] = [];

        for (const [key, abs] of modelAbsPaths) {
            tasks.push(pool.submit(async () => {
                const text = await readTextFile(abs);
                const json = JSON.parse(text);
                json.normalizeKey = key;
                return json;
            }));
        }

        const parsedModels = await Promise.allSettled(tasks);
        for (const task of parsedModels) {
            if (task.status === 'rejected') continue;

            const json = task.value;

            const key = json.normalizeKey;
            if (!key || typeof key !== 'string') continue;

            const textures = json.textures;
            if (textures && typeof textures === 'object') {
                this.parseTextures(key, textures);
            }
        }
    }

    private parseTextures(key: string, textures: object): void {
        // 当前只需要单层
        for (const textureKey of Object.values(textures)) {
            if (typeof textureKey !== 'string') continue;

            if (!this.resource!.hasTexture(textureKey)) {
                console.warn(`[TextureResource] Model ${textureKey} references missing texture: ${textureKey}`);
                continue;
            }

            this.models.set(key, this.createModel(textureKey));
            break;
        }
    }

    public reload(): Promise<void> {
        this.unload();
        return this.load();
    }

    public unload(): void {
        this.resource = null;
        this.models.clear();
    }

    private createModel(textureKey: string, config?: DisplayConfig) {
        return new Model(this.resource!, textureKey, config);
    }

    public getModel(key: string | undefined): Model {
        if (!key) return this.defaultModel!;
        return this.models.get(key) ?? this.defaultModel!;
    }
}