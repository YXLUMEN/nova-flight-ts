import type {UUID} from "../../type/types.ts";

export interface PendingConnection {
    sessionId: number;
    clientId: UUID;
    timestamp: number;
}