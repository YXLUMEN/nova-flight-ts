import {invoke} from "@tauri-apps/api/core";
import {Result} from "../../utils/result/Result.ts";

export async function startServer(port: number): Promise<Result<ArrayBuffer, Error>> {
    try {
        const obj: number[] = await invoke('start_server', {port});
        if (!Array.isArray(obj)) {
            return Result.err(new TypeError('Key must be an number array'));
        }

        const buffer = new Uint8Array(obj).buffer;
        return Result.ok(buffer);
    } catch (err) {
        return Result.err(Result.mapErr(err));
    }
}

export function stopServer(): Promise<boolean> {
    return invoke('stop_server');
}

export async function choseDir(): Promise<Result<ChosenDirResult, Error>> {
    try {
        const results: ChosenDirResult = await invoke('chose_dir');
        return Result.ok(results);
    } catch (err) {
        return Result.err(Result.mapErr(err));
    }
}

interface ChosenDirResult {
    root: string,
    files: string[],
}