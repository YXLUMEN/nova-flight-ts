import type {UUID} from "../../type/types.ts";

export class GameProfile {
    public readonly sessionId: number;
    public readonly clientId: UUID;
    public readonly name: string;

    public constructor(sessionId: number, clientId: UUID, name: string) {
        this.sessionId = sessionId;
        this.clientId = clientId;
        this.name = name;
        Object.freeze(this);
    }

    public toString(): string {
        return `SID: "${this.sessionId}" UUID: "${this.clientId}" Name: "${this.name}"`;
    }
}