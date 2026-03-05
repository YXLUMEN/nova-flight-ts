import type {UUID} from "../../apis/types.ts";

export interface PendingConnection {
    sessionId: number;
    clientId: UUID;
    timestamp: number;
}