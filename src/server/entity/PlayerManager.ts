import type {UUID} from "../../type/types.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {ServerStorage} from "../storage/ServerStorage.ts";
import {GameProfile} from "./GameProfile.ts";
import {ServerPlayHandler} from "../network/handler/ServerPlayHandler.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {PlayerJoinS2CPacket} from "../../network/packet/s2c/PlayerJoinS2CPacket.ts";
import type {ServerWorld} from "../ServerWorld.ts";
import {Log} from "../../worker/log.ts";
import {NoResultsError} from "../../type/errors.ts";
import type {ServerConnection} from "../network/ServerConnection.ts";
import {ConnectionState} from "../network/ConnectionState.ts";
import {ServerCommonHandler} from "../network/handler/ServerCommonHandler.ts";
import {PlayerDisconnectS2CPacket} from "../../network/packet/s2c/PlayerDisconnectS2CPacket.ts";
import {TickChangeS2CPacket} from "../../network/packet/s2c/TickChangeS2CPacket.ts";
import {PlayerDataStorage} from "../storage/PlayerDataStorage.ts";

export class PlayerManager {
    private readonly server: NovaFlightServer;
    private readonly uuidToPlayer: Map<UUID, ServerPlayerEntity> = new Map();
    private readonly sessionToPlayer: Map<number, ServerPlayerEntity> = new Map();
    private readonly pendingLogin: Set<UUID> = new Set();

    private readonly playerIo: PlayerDataStorage;

    public constructor(server: NovaFlightServer) {
        this.server = server;
        this.playerIo = new PlayerDataStorage(this.server.worldName, ServerStorage.db);
    }

    public placePlayer(
        connection: ServerConnection,
        profile: GameProfile,
        player: ServerPlayerEntity,
    ): void {
        const world = this.server.world;
        if (!world) return;

        player.setUuid(profile.clientId);
        connection.cleanBuffer();
        const playHandler = new ServerPlayHandler(this.server, connection, player);
        connection.setPacketListener(ConnectionState.PLAY, playHandler);

        this.uuidToPlayer.set(profile.clientId, player);
        this.sessionToPlayer.set(profile.sessionId, player);
        if (this.uuidToPlayer.size > 1) {
            world.getServer().setPause(false);
            this.server.isMultiPlayer = true;
        }

        playHandler.send(new JoinGameS2CPacket(player.getId(), this.server.worldName));
        playHandler.send(new TickChangeS2CPacket(this.server.getTickManager().getRate()));
        connection.broadcast(new PlayerJoinS2CPacket(profile.name, profile.clientId));
        world.addPlayer(player);

        console.log(`[Server] Player ${profile.clientId} login`);
    }

    /**
     * @reserve
     *
     * 使用前检查,此版本可能与当前实现不符.
     * */
    public respawnPlayer(player: ServerPlayerEntity, alive: boolean): void {
        this.uuidToPlayer.delete(player.getUUID());
        (player.getWorld() as ServerWorld).removePlayer(player);

        const newPlayer = new ServerPlayerEntity(this.server.world!, player.profile());
        newPlayer.networkHandler = player.networkHandler;
        newPlayer.setId(player.getId());
        newPlayer.copyFrom(player, alive);

        const targetPos = player.positionRef;
        newPlayer.snapTo(targetPos.x, targetPos.y, player.getYaw());

        (newPlayer.getWorld() as ServerWorld).addPlayer(newPlayer);
        this.uuidToPlayer.set(newPlayer.getUUID(), newPlayer);
        this.sessionToPlayer.set(newPlayer.profile().sessionId, newPlayer);
    }

    public async loadPlayerData(profile: GameProfile): Promise<NbtCompound | null> {
        const result = await this.playerIo.loadPlayer(profile);
        if (result.isOk()) return result.unwrap();

        const err = result.unwrapErr();
        if (err instanceof NoResultsError) return null;
        Log.error(err.message);

        return null;
    }

    protected async savePlayerData(player: ServerPlayerEntity): Promise<void> {
        const result = await this.playerIo.savePlayer(player);
        if (result.isErr()) {
            Log.error(result.unwrapErr().message);
        }
    }

    public removePlayer(player: ServerPlayerEntity): void {
        const world = player.getWorld() as ServerWorld;
        void this.savePlayerData(player);

        world.removePlayer(player);

        const uuid: UUID = player.getUUID();
        const exist = this.uuidToPlayer.get(uuid);
        if (exist === player) {
            this.uuidToPlayer.delete(uuid);
            this.sessionToPlayer.delete(player.profile().sessionId);
        }

        // 允许回退,启用混合服务器后注意适配
        if (this.uuidToPlayer.size === 1) {
            this.server.isMultiPlayer = false;
        }
        this.server.networkChannel.send(new PlayerDisconnectS2CPacket(uuid, ServerCommonHandler.LOGOUT));
    }

    public getPlayer(uuid: UUID): ServerPlayerEntity | null {
        return this.uuidToPlayer.get(uuid) ?? null;
    }

    public getPlayerByName(playerName: string): ServerPlayerEntity | null {
        const lowerName = playerName.toLowerCase();

        for (const player of this.uuidToPlayer.values()) {
            if (player.profile().name.toLowerCase() === lowerName) {
                return player;
            }
        }
        return null;
    }

    public getPlayerBySessionId(sessionId: number): ServerPlayerEntity | null {
        return this.sessionToPlayer.get(sessionId) ?? null;
    }

    public hasLogin(uuid: UUID): boolean {
        return this.isPlayerExists(uuid) || this.pendingLogin.has(uuid);
    }

    public addLogin(uuid: UUID) {
        this.pendingLogin.add(uuid);
        return () => this.pendingLogin.delete(uuid);
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
            .map(player => player.profile().name);
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