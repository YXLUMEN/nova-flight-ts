import {resolve} from "@tauri-apps/api/path";
import {type DirEntry, exists, readDir} from "@tauri-apps/plugin-fs";
import type {BiConsumer} from "../type/types.ts";

export async function traverse_dir(parent: string, callback: BiConsumer<string, DirEntry>, depth: number = 0, maxDepth = 3): Promise<void> {
    if (depth >= maxDepth) {
        return;
    }

    if (!await exists(parent)) {
        return;
    }

    const dirs = await readDir(parent);
    for (const dir of dirs) {
        callback(parent, dir);

        if (dir.isDirectory) {
            const child = await resolve(parent, dir.name);
            await traverse_dir(child, callback, depth + 1, maxDepth);
        }
    }
}

export function normalizedDir(root: string, absParent: string, filename: string, namespace: string): string {
    const relativeParent = absParent.replace(root, '').replace(/^[/\\]+/, '');
    const name = pruneSuffix(filename);
    return relativeParent.length > 0 ?
        `${namespace}:${relativeParent}/${name}` :
        `${namespace}:${name}`;
}

export function pruneSuffix(filename: string): string {
    const i = filename.lastIndexOf('.');
    return i < 0 ? filename : filename.substring(0, i);
}

export interface FileEntry {
    path: string;
    parent: string;
    name: string;
}