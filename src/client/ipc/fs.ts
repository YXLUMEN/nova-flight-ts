import type {BiConsumer} from "../../type/types.ts";
import {type DirEntry, exists, readDir} from "@tauri-apps/plugin-fs";
import {invoke} from "@tauri-apps/api/core";
import {resolve, resolveResource} from "@tauri-apps/api/path";
import {Result} from "../../utils/result/Result.ts";

export async function choseDir(): Promise<Result<DirResult, Error>> {
    try {
        const results: DirResult = await invoke('chose_dir');
        return Result.ok(results);
    } catch (err) {
        return Result.err(Result.mapErr(err));
    }
}

export async function traverse_dir_cmd(
    path: string,
    maxDepth: number = 8,
): Promise<Result<DirResult, Error>> {
    try {
        if (maxDepth < 0 || !Number.isSafeInteger(maxDepth)) {
            return Result.err(new TypeError('Max depth must be a positive integer'));
        }

        const url = await resolveResource(path);
        const results: DirResult = await invoke('traverse_files_cmd', {url, maxDepth});
        return Result.ok(results);
    } catch (err) {
        return Result.err(Result.mapErr(err));
    }
}

export async function traverse_dir(
    parent: string,
    callback: BiConsumer<string, DirEntry>,
    maxDepth = 3,
    depth: number = 0,
): Promise<void> {
    if (depth >= maxDepth) {
        return;
    }

    if (!await exists(parent)) return;
    const dirs = await readDir(parent);
    for (const dir of dirs) {
        callback(parent, dir);

        if (dir.isDirectory) {
            const child = await resolve(parent, dir.name);
            await traverse_dir(child, callback, maxDepth, depth + 1);
        }
    }
}

interface DirResult {
    root: string,
    files: string[],
}