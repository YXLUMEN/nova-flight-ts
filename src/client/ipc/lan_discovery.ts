import {invoke} from "@tauri-apps/api/core";
import {Result} from "../../utils/result/Result.ts";

export interface LanServer {
    name: string;
    addr: string;
    game_version: number;
    last_seen_ms: number;
}

export async function startLanAnnounce(
    port: number,
    name: string,
    gameVersion: number,
): Promise<Result<void, Error>> {
    try {
        await invoke('start_lan_announce', {port, name, gameVersion});
        return Result.ok(undefined);
    } catch (err) {
        return Result.err(Result.mapErr(err));
    }
}

export function stopLanAnnounce(): Promise<boolean> {
    return invoke('stop_lan_announce');
}

export function startLanSniff(): Promise<void> {
    return invoke('start_lan_sniff');
}

export function stopLanSniff(): Promise<boolean> {
    return invoke('stop_lan_sniff');
}

export function listLanServers(): Promise<LanServer[]> {
    return invoke<LanServer[]>('list_lan_servers');
}

export function isLanSniffing(): Promise<boolean> {
    return invoke('is_lan_sniffing');
}
