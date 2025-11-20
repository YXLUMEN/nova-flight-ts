import type {UUID} from "../../apis/types.ts";
import {GameProfile} from "./GameProfile.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {Optional} from "../../utils/Optional.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";

export class PlayerManager {
    private readonly uuidToPlayer: Map<UUID, GameProfile> = new Map();
    private readonly sessionIdToPlayer: Map<number, GameProfile> = new Map();

    public loadPlayerData(_player: ServerPlayerEntity): Optional<NbtCompound> {
        return Optional.empty();
    }

    public addPlayer(profile: GameProfile): boolean {
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

    public getProfileByUUID(uuid: UUID): GameProfile | null {
        return this.uuidToPlayer.get(uuid) ?? null;
    }

    public getProfileBySessionId(sessionId: number): GameProfile | null {
        return this.sessionIdToPlayer.get(sessionId) ?? null;
    }

    public isPlayerExists(uuid: UUID): boolean {
        return this.uuidToPlayer.has(uuid);
    }

    public getAllProfile() {
        return this.uuidToPlayer.values();
    }
}