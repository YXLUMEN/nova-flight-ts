import type {UUID} from "../../apis/types.ts";
import {ServerPlayerEntity} from "./ServerPlayerEntity.ts";
import {NbtCompound} from "../../nbt/NbtCompound.ts";
import type {NovaFlightServer} from "../NovaFlightServer.ts";
import {ServerDB} from "../ServerDB.ts";
import {GameProfile} from "./GameProfile.ts";
import {ServerPlayNetworkHandler} from "../network/ServerPlayNetworkHandler.ts";
import {JoinGameS2CPacket} from "../../network/packet/s2c/JoinGameS2CPacket.ts";
import {GameMessageS2CPacket} from "../../network/packet/s2c/GameMessageS2CPacket.ts";
import type {ServerWorld} from "../ServerWorld.ts";

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
        world.spawnPlayer(player);

        networkHandler.send(new JoinGameS2CPacket(player.getId()));
        channel.send(new GameMessageS2CPacket(`\x1b[32m${player.playerProfile.name}\x1b[0m join the game`));

        console.log(`Player ${profile.clientId} login`);
    }

    public createPlayer(profile: GameProfile) {
        return new ServerPlayerEntity(this.server.world!, profile);
    }

    public async loadPlayerData(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        if (this.server.isNewSave()) return null;
        return await ServerDB.loadPlayer(player);
    }

    private savePlayerData(player: ServerPlayerEntity): Promise<void> {
        return ServerDB.savePlayer(player);
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

    public getPlayerBySessionId(sessionId: number): ServerPlayerEntity | null {
        return this.sessionToPlayer.get(sessionId) ?? null;
    }

    public isPlayerExists(uuid: UUID): boolean {
        return this.players.has(uuid);
    }

    public getAllPlayers() {
        return this.players.values();
    }

    public async saveAllPlayerData() {
        for (const player of this.players.values()) {
            await this.savePlayerData(player);
        }
    }
}