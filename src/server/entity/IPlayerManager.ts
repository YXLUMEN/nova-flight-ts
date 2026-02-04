import {GameProfile} from "./GameProfile.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {UUID} from "../../apis/types.ts";

export interface IPlayerManager {
    onPlayerAttemptLogin(profile: GameProfile, player: ServerPlayerEntity, session?: any): Promise<void>;

    createPlayer(profile: GameProfile): ServerPlayerEntity;

    loadPlayerData(player: ServerPlayerEntity): Promise<NbtCompound | null>;

    removePlayer(player: ServerPlayerEntity): Promise<void>;

    getPlayer(uuid: UUID): ServerPlayerEntity | null;

    getPlayerBySessionId(sessionId: number): ServerPlayerEntity | null;

    isPlayerExists(uuid: UUID): boolean;

    getAllPlayers(): Iterable<ServerPlayerEntity>;

    saveAllPlayerData(): Promise<void>;
}