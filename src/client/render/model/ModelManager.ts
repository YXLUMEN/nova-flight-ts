import {ResourceManager} from "../../resource/ResourceManager.ts";
import {Resources} from "../../resource/Resources.ts";
import {Registries} from "../../../registry/Registries.ts";
import type {Item} from "../../../item/Item.ts";
import {TextureMapping} from "./TextureMapping.ts";
import type {Tech} from "../../../world/tech/Tech.ts";
import type {ModelResource} from "../../resource/ModelResource.ts";
import type {Model} from "./Model.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {exists, mkdir, writeTextFile} from "@tauri-apps/plugin-fs";

export class ModelManager {
    private static items = new Map<Item, string>();
    private static techs = new Map<Tech, string>();

    private static model: ModelResource | null = null;

    public static getItemModel(item: Item): Model {
        return this.model!.getModel(this.items.get(item));
    }

    public static getTechModel(tech: Tech): Model {
        return this.model!.getModel(this.techs.get(tech));
    }

    private static generateItemModel(): void {
        for (const entry of Registries.ITEM.getEntries()) {
            const item = entry.getValue();
            const id = TextureMapping.layer0(item);
            this.items.set(item, id.toString());
        }
    }

    private static generateTechModel(): void {
        for (const entry of Registries.TECH.getEntries()) {
            const tech = entry.getValue();
            const id = TextureMapping.getTechTexture(tech);
            this.techs.set(tech, id.toString());
        }
    }

    public static generateAll(): void {
        this.model = ResourceManager.get<ModelResource>(Resources.MODEL);

        // 生成资源键
        this.generateItemModel();
        this.generateTechModel();
    }

    public static async generateModelJsons(): Promise<void> {
        const root = await resolveResource('generate/nova-flight');
        if (!await exists(root)) await mkdir(root, {recursive: true});

        await this.save(root, 'item', 'nova-flight:', this.items.values());
        await this.save(root, 'tech', 'nova-flight:', this.techs.values());
    }

    private static async save(root: string, child: string, namespace: string, normalizeKeys: Iterable<string>): Promise<void> {
        child = await resolve(root, child);
        if (!await exists(child)) await mkdir(child);

        for (const key of normalizeKeys) {
            const path = key.replace(namespace, '') + '.json';
            const abs = await resolve(root, path);
            const config = {
                textures: {
                    layer0: key
                }
            };
            const text = JSON.stringify(config);
            await writeTextFile(abs, text, {
                append: false,
                create: true
            });
        }
    }
}