import type {UUID} from "../../apis/types.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {ServerStorage} from "../ServerStorage.ts";
import {GameProfile} from "./GameProfile.ts";
import {ServerPlayNetworkHandler} from "../network/ServerPlayNetworkHandler.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {PlayerJoinS2CPacket} from "../../network/packet/s2c/PlayerJoinS2CPacket.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {Log} from "../../worker/log.ts";
import {NoResultsError} from "../../apis/errors.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";

export class PlayerManager {
    private readonly server: NovaFlightServer;
    private readonly players: Map<UUID, ServerPlayerEntity> = new Map();
    private readonly sessionToPlayer: Map<number, ServerPlayerEntity> = new Map();

    public constructor(server: NovaFlightServer) {
        this.server = server;
    }

    public async onPlayerAttemptLogin(profile: GameProfile, player: ServerPlayerEntity): Promise<void> {
        const world = this.server.world;
        if (!world) return;
        const channel = this.server.networkChannel;

        player.setUuid(profile.clientId);
        const playerData = await this.loadPlayerData(player);
        if (playerData !== null) {
            player.readNBT(playerData);
        }

        const networkHandler = new ServerPlayNetworkHandler(this.server, channel, player);
        this.players.set(profile.clientId, player);
        this.sessionToPlayer.set(profile.sessionId, player);
        if (this.players.size > 1) {
            world.setTicking(true);
            this.server.isMultiPlayer = true;
        }
        world.addPlayer(player);

        networkHandler.send(new JoinGameS2CPacket(player.getId(), this.server.worldName));
        channel.send(new PlayerJoinS2CPacket(profile.name, profile.clientId));

        console.log(`[Server] Player ${profile.clientId} login`);
    }

    public createPlayer(profile: GameProfile): ServerPlayerEntity {
        return new ServerPlayerEntity(this.server.world!, profile);
    }

    public respawnPlayer(player: ServerPlayerEntity, alive: boolean): void {
        this.players.delete(player.getUUID());
        (player.getWorld() as ServerWorld).removePlayer(player);

        const newPlayer = this.createPlayer(player.getProfile());
        newPlayer.networkHandler = player.networkHandler;
        newPlayer.setId(player.getId());
        newPlayer.copyFrom(player, alive);

        const targetPos = player.getPositionRef;
        newPlayer.lastDamageTime = 60;
        newPlayer.refreshPositionAndAngles(targetPos.x, targetPos.y, player.getYaw());

        (newPlayer.getWorld() as ServerWorld).addPlayer(newPlayer);
        this.players.set(newPlayer.getUUID(), newPlayer);
        this.sessionToPlayer.set(newPlayer.getProfile().sessionId, newPlayer);
    }

    public async loadPlayerData(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        const result = await ServerStorage.loadPlayer(player);
        if (result.isOk()) return result.unwrap();

        const err = result.unwrapErr();
        if (err instanceof NoResultsError) return null;
        Log.error(err.message);

        return null;
    }

    protected async savePlayerData(player: ServerPlayerEntity): Promise<void> {
        const result = await ServerStorage.savePlayer(player);
        if (result.isErr()) {
            Log.error(result.unwrapErr().message);
        }
    }

    public async removePlayer(player: ServerPlayerEntity): Promise<void> {
        const world = player.getWorld() as ServerWorld;
        await this.savePlayerData(player);

        world.removePlayer(player);
        this.players.delete(player.getUUID());
        this.sessionToPlayer.delete(player.getProfile().sessionId);
        this.server.networkChannel.send(new GameMessageS2CPacket(`\x1b[32m${player.playerProfile.name}\x1b[0m leave the game`));
    }

    public getPlayer(uuid: UUID): ServerPlayerEntity | null {
        return this.players.get(uuid) ?? null;
    }

    public getPlayerByName(playerName: string): ServerPlayerEntity | null {
        const lowerName = playerName.toLowerCase();

        for (const player of this.players.values()) {
            if (player.getProfile().name.toLowerCase() === lowerName) {
                return player;
            }
        }
        return null;
    }

    public getPlayerBySessionId(sessionId: number): ServerPlayerEntity | null {
        return this.sessionToPlayer.get(sessionId) ?? null;
    }

    public isPlayerExists(uuid: UUID): boolean {
        return this.players.has(uuid);
    }

    public getAllPlayers() {
        return this.players.values();
    }

    public getPlayerNames() {
        return this.players
            .values()
            .map(player => player.getProfile().name);
    }

    public async saveAllPlayerData(): Promise<void> {
        const promises = this.players
            .values()
            .map(player => this.savePlayerData(player));

        const results = await Promise.allSettled(promises);
        let failed = 0;
        for (const result of results) {
            if (result.status !== 'fulfilled') failed++;
        }

        if (failed > 0) console.warn(`[Server] Error while saving players, failed ${failed}`);
    }
}