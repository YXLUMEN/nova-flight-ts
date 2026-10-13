import {invoke} from "@tauri-apps/api/core";

export async function startServer(port: number): Promise<ArrayBuffer> {
    const obj = await invoke<number[]>('start_server', {port});
    if (!Array.isArray(obj)) {
        throw new TypeError("Key must be an number array");
    }
    return new Uint8Array(obj).buffer;
}

export function stopServer(): Promise<boolean> {
    return invoke('stop_server');
}

export function choseDir(): Promise<ChosenDirResult> {
    return invoke('chose_dir');
}

interface ChosenDirResult {
    root: string,
    files: string[],
}