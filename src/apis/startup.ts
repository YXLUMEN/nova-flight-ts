import type {UUID} from "./types.ts";

export interface StartServer {
    addr: string;
    key: ArrayBuffer;
    hostUUID: UUID;
    action: number;
    saveName: string
}