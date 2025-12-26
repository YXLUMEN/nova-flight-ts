export interface Save {
    save_name: string,
    data: Uint8Array<ArrayBufferLike>,
    version: number,
    timestamp: number,
}

export interface PlayerData {
    save_name: string,
    uuid: string,
    data: Uint8Array<ArrayBufferLike>,
    version: number,
}