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
import {wrapRadians} from "../../utils/math/math.ts";

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
        const modelJson = new Map<string, any>();

        for (const task of parsedModels) {
            if (task.status === 'rejected') continue;
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

    private resolveModel(modelJsons: Map<string, any>, key: string): Model | null {
        let finalTextures: Record<string, string> | null = null;
        let finalDisplay: DisplayConfig | null = null;

        let currentKey = key;
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

            if (currentJson.textures && typeof currentJson.textures === 'object') {
                finalTextures = currentJson.textures;
            }

            if (currentJson.display) {
                finalDisplay = this.parseDisplayConfig(currentJson.display);
            }

            currentKey = currentJson.parent;
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

    private parseDisplayConfig(display: any): DisplayConfig | null {
        if (!display || typeof display !== 'object') return null;

        const config: DisplayConfig = {};
        if (typeof display.rotation === 'number') {
            config.rotation = wrapRadians(display.rotation);
        }

        if (Array.isArray(display.scale) && display.scale.length === 2) {
            let x = Number(display.scale[0]);
            let y = Number(display.scale[1]);
            x = isFinite(x) ? x : 1;
            y = isFinite(y) ? y : 1;

            config.scale = [x, y];
        }

        if (Array.isArray(display.offset) && display.offset.length === 2) {
            let x = Number(display.offset[0]);
            let y = Number(display.offset[1]);
            x = isFinite(x) ? x : 0;
            y = isFinite(y) ? y : 0;

            config.offset = [x, y];
        }

        return config;
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