import type {ResourceModule} from "./ResourceModule.ts";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import {Resources} from "./Resources.ts";
import {normalizedDir, pruneSuffix, traverse_dir} from "../../utils/fs.ts";
import {exists, readFile} from "@tauri-apps/plugin-fs";
import {convertFileSrc} from "@tauri-apps/api/core";
import {error} from "@tauri-apps/plugin-log";
import type {TexturePath} from "../render/model/TexturePath.ts";
import {config} from "../../utils/uit.ts";
import type {TextureProvider} from "../render/model/TextureProvider.ts";

export class TextureResource implements ResourceModule, TextureProvider {
    public static readonly DEFAULT_TEXTURE_ID = 'builtin/default';

    private readonly texturePaths = new Map<string, TexturePath>();
    private readonly textureCache = new Map<string, ImageBitmap>();

    private readonly defaultTexturePath: string = '/textures/default.png';
    private defaultTexture: ImageBitmap | null = null;
    private transparent: ImageBitmap | null = null;

    public getId(): RegistryEntry<string> {
        return Resources.TEXTURE;
    }

    public async load(): Promise<void> {
        if (!this.defaultTexture) await this.builtinDefault();
        if (!this.transparent) await this.builtinTransparent();

        const root = await resolveResource(`resources/nova-flight`);
        const textureDir = await resolve(root, 'textures');

        // 将路径下贴图注册
        await traverse_dir(textureDir, (absParent, entry) => {
            if (!entry.isFile || !entry.name.endsWith('.png')) return;

            const key = normalizedDir(textureDir, absParent, entry.name, 'nova-flight');
            const name = pruneSuffix(entry.name);

            const abs = `${absParent}\\${name}.png`;
            const covered = convertFileSrc(abs);
            this.texturePaths.set(key, config({abs, covered}));
        });

        this.textureCache.set('builtin/default', this.defaultTexture!);
    }

    public getTexture(key: string): ImageBitmap {
        if (this.textureCache.has(key)) {
            return this.textureCache.get(key)!;
        }

        if (!this.texturePaths.has(key)) {
            return this.defaultTexture!;
        }

        // 占位防重入
        this.textureCache.set(key, this.transparent!);
        this.loadTexture(key).catch(err => {
            const msg = `[TextureResource] Failed to load texture ${key}: ${err}`;
            console.error(msg);
            void error(msg);
        });

        return this.transparent!;
    }

    public getCovered(key: string): string {
        const path = this.texturePaths.get(key);
        if (path) return path.covered;
        return this.defaultTexturePath;
    }

    public hasTexture(key: string): boolean {
        return this.texturePaths.has(key);
    }

    private async loadTexture(key: string): Promise<void> {
        const texture = this.texturePaths.get(key);
        if (!texture || !await exists(texture.abs)) return;

        const buffer = await readFile(texture.abs);
        const blob = new Blob([buffer], {type: "image/png"});
        const bitmap = await createImageBitmap(blob);
        this.textureCache.set(key, bitmap);
    }

    private async builtinDefault(): Promise<void> {
        const size = 16;
        const cell = 8;
        const canvas = new OffscreenCanvas(size, size);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, size, size);

        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, cell, cell);
        ctx.fillRect(cell, cell, cell, cell);

        this.defaultTexture = await createImageBitmap(canvas);
    }

    private async builtinTransparent(): Promise<void> {
        const canvas = new OffscreenCanvas(1, 1);
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = 'rgba(0,0,0,0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        this.transparent = await createImageBitmap(canvas);
    }

    public reload(): Promise<void> {
        this.unload();
        return this.load();
    }

    public unload(): void {
        this.texturePaths.clear();
        for (const bitmap of this.textureCache.values()) {
            bitmap.close();
        }
        this.textureCache.clear();

        this.defaultTexture?.close();
        this.transparent?.close();
        this.defaultTexture = null;
        this.transparent = null;
    }

    public dispose(key: string): void {
        if (this.textureCache.has(key)) {
            this.textureCache.get(key)!.close();
            this.textureCache.delete(key);
        }
    }
}