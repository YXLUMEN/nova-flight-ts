import {invoke} from "@tauri-apps/api/core";
import {LogLevel} from '@tauri-apps/plugin-log'
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

export async function writeLog(level: LogLevel, message: string) {
    try {
        await invoke('plugin:log|log', {level, message})
    } catch (e) {
        console.error(message, e);
    }
}