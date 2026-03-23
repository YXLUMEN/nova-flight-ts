import type {UUID} from "../../apis/types.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {ServerStorage} from "../ServerStorage.ts";
import {GameProfile} from "./GameProfile.ts";
import {ServerStableHandler} from "../network/handler/ServerStableHandler.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {PlayerJoinS2CPacket} from "../../network/packet/s2c/PlayerJoinS2CPacket.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {Log} from "../../worker/log.ts";
import {NoResultsError} from "../../apis/errors.ts";
import type {ServerConnection} from "../network/ServerConnection.ts";
import {ConnectionState} from "../network/ConnectionState.ts";
import {ServerCommonHandler} from "../network/handler/ServerCommonHandler.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";

export class PlayerManager {
    private readonly server: NovaFlightServer;
    private readonly uuidToPlayer: Map<UUID, ServerPlayerEntity> = new Map();
    private readonly sessionToPlayer: Map<number, ServerPlayerEntity> = new Map();

    public constructor(server: NovaFlightServer) {
        this.server = server;
    }

    public async onPlayerLogin(connection: ServerConnection, profile: GameProfile, player: ServerPlayerEntity): Promise<void> {
        const world = this.server.world;
        if (!world) return;

        player.setUuid(profile.clientId);
        const handler = new ServerStableHandler(this.server, connection, player);
        connection.setPacketListener(ConnectionState.STABLE, handler);

        this.uuidToPlayer.set(profile.clientId, player);
        this.sessionToPlayer.set(profile.sessionId, player);
        if (this.uuidToPlayer.size > 1) {
            world.getServer().setPause(false);
            this.server.isMultiPlayer = true;
        }

        const playerData = await this.loadPlayerData(player);
        if (playerData !== null) {
            player.readNBT(playerData);
        }

        world.addPlayer(player);
        handler.send(new JoinGameS2CPacket(player.getId(), this.server.worldName));
        connection.broadcast(new PlayerJoinS2CPacket(profile.name, profile.clientId));

        console.log(`[Server] Player ${profile.clientId} login`);
    }

    public createPlayer(profile: GameProfile): ServerPlayerEntity {
        return new ServerPlayerEntity(this.server.world!, profile);
    }

    public respawnPlayer(player: ServerPlayerEntity, alive: boolean): void {
        this.uuidToPlayer.delete(player.getUUID());
        (player.getWorld() as ServerWorld).removePlayer(player);

        const newPlayer = this.createPlayer(player.getProfile());
        newPlayer.networkHandler = player.networkHandler;
        newPlayer.setId(player.getId());
        newPlayer.copyFrom(player, alive);

        const targetPos = player.getPositionRef;
        newPlayer.lastDamageTime = 60;
        newPlayer.refreshPositionAndAngles(targetPos.x, targetPos.y, player.getYaw());

        (newPlayer.getWorld() as ServerWorld).addPlayer(newPlayer);
        this.uuidToPlayer.set(newPlayer.getUUID(), newPlayer);
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

    public removePlayer(player: ServerPlayerEntity): void {
        const world = player.getWorld() as ServerWorld;
        this.savePlayerData(player).then();

        world.removePlayer(player);
        const uuid = player.getUUID();
        const exist = this.uuidToPlayer.get(uuid);
        if (exist === player) {
            this.uuidToPlayer.delete(uuid);
            this.sessionToPlayer.delete(player.getProfile().sessionId);
        }

        this.server.networkChannel.send(new PlayerDisconnectS2CPacket(player.getUUID(), ServerCommonHandler.LOGOUT));
    }

    public getPlayer(uuid: UUID): ServerPlayerEntity | null {
        return this.uuidToPlayer.get(uuid) ?? null;
    }

    public getPlayerByName(playerName: string): ServerPlayerEntity | null {
        const lowerName = playerName.toLowerCase();

        for (const player of this.uuidToPlayer.values()) {
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
        return this.uuidToPlayer.has(uuid);
    }

    public getAllPlayers() {
        return this.uuidToPlayer.values();
    }

    public getPlayerNames() {
        return this.uuidToPlayer
            .values()
            .map(player => player.getProfile().name);
    }

    public async saveAllPlayerData(): Promise<void> {
        const promises = this.uuidToPlayer
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