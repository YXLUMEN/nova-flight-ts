export interface SaveMeta {
    readonly save_name: string;
    display_name: string;
    version: number;
    timestamp: number;
    status: string;
}

export interface Save {
    readonly save_name: string;
    readonly data: Uint8Array<ArrayBuffer>;
    readonly version: number;
    readonly status: string;
}

export interface PlayerData {
    readonly save_name: string,
    readonly uuid: string,
    data: Uint8Array<ArrayBuffer>,
    version: number,
}