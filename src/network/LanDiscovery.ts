import {invoke} from "@tauri-apps/api/core";

export interface LanServerInfo {
    name: string;
    addr: string;
    gameVersion: number;
    lastSeenMs: number;
}

/** UDP discovery port used by the Rust LAN discovery module. */
export const LAN_DISCOVERY_PORT = 25567;

export async function startLanAnnounce(
    port: number,
    name: string,
    gameVersion: number,
): Promise<void> {
    await invoke("start_lan_announce", {port, name, game_version: gameVersion});
}

export function stopLanAnnounce(): Promise<boolean> {
    return invoke<boolean>("stop_lan_announce");
}

export async function startLanSniff(): Promise<void> {
    await invoke("start_lan_sniff");
}

export function stopLanSniff(): Promise<boolean> {
    return invoke<boolean>("stop_lan_sniff");
}

export function listLanServers(): Promise<LanServerInfo[]> {
    return invoke<LanServerInfo[]>("list_lan_servers");
}

export function isLanSniffing(): Promise<boolean> {
    return invoke<boolean>("is_lan_sniffing");
}
