import type {UUID} from "../../apis/types.ts";

export class PlayerProfile {
    public readonly sessionId: number;
    public readonly clientId: UUID;
    public readonly playerName: string;

    public constructor(sessionId: number, clientId: UUID, playerName: string) {
        this.sessionId = sessionId;
        this.clientId = clientId;
        this.playerName = playerName;
    }
}