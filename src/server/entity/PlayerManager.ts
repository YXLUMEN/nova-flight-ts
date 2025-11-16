import type {UUID} from "../../apis/types.ts";
import {PlayerProfile} from "./PlayerProfile.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";

export class PlayerManager {
    // @ts-ignore
    private readonly server: NovaFlightServer;
    private readonly uuidToPlayer: Map<UUID, PlayerProfile> = new Map();
    private readonly sessionIdToPlayer: Map<number, PlayerProfile> = new Map();

    public constructor(server: NovaFlightServer) {
        this.server = server;
    }

    public addPlayer(profile: PlayerProfile): boolean {
        if (this.uuidToPlayer.has(profile.clientId)) return false;

        this.uuidToPlayer.set(profile.clientId, profile);
        this.sessionIdToPlayer.set(profile.sessionId, profile);

        return true;
    }

    public removePlayer(uuid: UUID): boolean {
        const profile = this.uuidToPlayer.get(uuid);
        if (!profile) return false;

        this.uuidToPlayer.delete(profile.clientId);
        this.sessionIdToPlayer.delete(profile.sessionId);
        return true;
    }

    public getProfileByUUID(uuid: UUID): PlayerProfile | null {
        return this.uuidToPlayer.get(uuid) ?? null;
    }

    public getProfileBySessionId(sessionId: number): PlayerProfile | null {
        return this.sessionIdToPlayer.get(sessionId) ?? null;
    }

    public isPlayerExists(uuid: UUID): boolean {
        return this.uuidToPlayer.has(uuid);
    }

    public getAllProfile() {
        return this.uuidToPlayer.values();
    }
}