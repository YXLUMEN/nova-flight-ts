export type MetaStatus = 'available' | 'pending' | 'broken' | 'outdated';

export interface SaveMeta {
    readonly save_name: string;
    display_name: string;
    format_version: number;
    game_version: number;
    timestamp: number;
    status: MetaStatus;
}

export interface Save {
    readonly save_name: string;
    readonly data: Uint8Array<ArrayBuffer>;
}

export interface PlayerData {
    readonly save_name: string,
    readonly uuid: string,
    data: Uint8Array<ArrayBuffer>,
    format_version: number;
    game_version: number;
}