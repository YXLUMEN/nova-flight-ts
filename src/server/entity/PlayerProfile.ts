import type {UUID} from "../../apis/types.ts";

export class PlayerProfile {
    public readonly sessionId: number;
    public readonly clientId: UUID;
    public readonly playerName: string;

    private devMode: boolean = false;
    private usedBeDev = false;

    public constructor(sessionId: number, clientId: UUID, playerName: string) {
        this.sessionId = sessionId;
        this.clientId = clientId;
        this.playerName = playerName;
    }

    public isDevMode(): boolean {
        return this.devMode;
    }

    public setDevMode(devMode: boolean): void {
        this.devMode = devMode;
        if (devMode) this.usedBeDev = true;
    }

    public isUsedBeDev(): boolean {
        return this.usedBeDev;
    }
}