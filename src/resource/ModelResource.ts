import type {RegistryEntry} from "../registry/tag/RegistryEntry.ts";
import type {ResourceModule} from "./ResourceModule.ts";
import {Resources} from "./Resources.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {normalizedDir, traverse_dir} from "../utils/fs.ts";
import {PromisePool} from "../utils/collection/PromisePool.ts";
import {readTextFile} from "@tauri-apps/plugin-fs";
import type {TextureResource} from "./TextureResource.ts";
import {Model} from "../client/render/model/Model.ts";
import {ResourceManager} from "./ResourceManager.ts";
import type {DisplayConfig} from "../client/render/model/DisplayConfig.ts";
import {wrapRadians} from "../utils/math/math.ts";

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
            const abs = `${absParent}/${entry.name}`;
            modelAbsPaths.set(key, abs);
        });

        const pool = new PromisePool<NormalizedJson>(16);
        const job = async (key: string, abs: string): Promise<NormalizedJson> => {
            const text = await readTextFile(abs);
            const json = JSON.parse(text);
            json.normalizeKey = key;
            return json;
        };

        for (const [key, abs] of modelAbsPaths) {
            void pool.spawn(job, key, abs);
        }

        const parsedModels = await pool.join();
        const modelJson = new Map<string, NormalizedJson>();

        for (const task of parsedModels) {
            if (task.status === 'rejected') {
                console.warn(`[ModelResource] Failed to load a model:`, task.reason);
                continue;
            }
            const json = task.value;
            const key = json.normalizeKey;
            if (key && typeof key === 'string') {
                modelJson.set(key, json);
            }
        }

        for (const key of modelJson.keys()) {
            const module = this.resolveModel(modelJson, key);
            if (module) this.models.set(key, module);
        }
    }

    private resolveModel(modelJsons: Map<string, NormalizedJson>, key: string): Model | null {
        let finalTextures: Record<string, string> | null = null;
        let finalDisplay: DisplayConfig | null = null;

        let currentKey: string | null = key;
        const visited = new Set<string>();

        while (currentKey) {
            if (visited.has(currentKey)) {
                console.warn(`[ModelResource] Circular inheritance detected for ${key}`);
                break;
            }
            visited.add(currentKey);

            const currentJson = modelJsons.get(currentKey);
            if (!currentJson) {
                if (currentKey !== key) {
                    console.warn(`[ModelResource] Parent model ${currentKey} not found for ${key}`);
                }
                break;
            }

            if (typeof currentJson.textures === 'object') {
                if (!finalTextures) finalTextures = this.parseTextures(currentJson.textures);
            }

            if (currentJson.display) {
                if (!finalDisplay) finalDisplay = this.parseDisplayConfig(currentJson.display);
            }

            if (typeof currentJson.parent === 'string') {
                currentKey = currentJson.parent;
            } else currentKey = null;
        }

        if (!finalTextures) return null;

        const textureKey = Object.values(finalTextures).at(0);
        if (!textureKey) {
            return null;
        }

        if (this.resource!.hasTexture(textureKey)) {
            return this.createModel(textureKey, finalDisplay ?? undefined);
        }

        console.warn(`[ModelResource] Model ${key} references missing texture: ${textureKey}`);
        return null;
    }

    private parseDisplayConfig(json: unknown): DisplayConfig | null {
        if (!json || typeof json !== 'object') return null;
        const record = json as Record<string, unknown>;

        const config: DisplayConfig = {};
        if (typeof record.rotation === 'number' && isFinite(record.rotation)) {
            config.rotation = wrapRadians(record.rotation);
        }

        if (Array.isArray(record.scale) && record.scale.length === 2) {
            let x = Number(record.scale[0]);
            let y = Number(record.scale[1]);
            x = isFinite(x) ? x : 1;
            y = isFinite(y) ? y : 1;

            config.scale = [x, y];
        }

        if (Array.isArray(record.offset) && record.offset.length === 2) {
            let x = Number(record.offset[0]);
            let y = Number(record.offset[1]);
            x = isFinite(x) ? x : 0;
            y = isFinite(y) ? y : 0;

            config.offset = [x, y];
        }

        return config;
    }

    private parseTextures(textures: object | null): Record<string, string> | null {
        if (textures === null) return null;

        const entries = Object.values(textures);
        if (entries.every(value => typeof value === 'string')) {
            return textures as Record<string, string>;
        }

        return null;
    }

    public reload(): Promise<void> {
        this.unload();
        return this.load();
    }

    public unload(): void {
        this.resource = null;
        this.models.clear();
        this.defaultModel = null;
    }

    private createModel(textureKey: string, config?: DisplayConfig) {
        return new Model(this.resource!, textureKey, config);
    }

    public getModel(key: string | undefined): Model {
        if (!key) return this.defaultModel!;
        return this.models.get(key) ?? this.defaultModel!;
    }
}

interface NormalizedJson extends Record<string, unknown> {
    normalizeKey: string;
}