import {IndexedDBHelper} from "../database/IndexedDBHelper.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {UUID} from "../apis/types.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {Result} from "../utils/result/Result.ts";
import type {PlayerData, Save} from "../apis/Saves.ts";

export class ServerDB {
    public static db = new IndexedDBHelper('nova-flight-server', 3, [
        {
            name: 'saves',
            keyPath: 'save_name',
        },
        {
            name: 'player_data',
            keyPath: ['save_name', 'uuid'],
        },
        {
            name: 'user_info',
            keyPath: 'name'
        }
    ]);

    public static async saveWorld(saveName: string, compound: NbtCompound): Promise<void> {
        return void this.db.update('saves', {
            save_name: saveName,
            data: compound.toCompactBinary(),
            timestamp: Date.now(),
            version: NbtCompound.VERSION
        } satisfies Save);
    }

    public static async savePlayer(player: ServerPlayerEntity): Promise<void> {
        const save_name = this.getSaveName(player);
        if (!save_name) return;
        const uuid: UUID = player.getUUID();

        const nbt = new NbtCompound();
        player.writeNBT(nbt);

        return void this.db.update('player_data', {
            save_name,
            uuid,
            data: nbt.toCompactBinary(),
            version: NbtCompound.VERSION
        } satisfies PlayerData);
    }

    public static async loadWorld(saveName: string): Promise<NbtCompound | null> {
        const result = await this.db.get<Save>('saves', saveName);
        const optional = result.ok();
        if (optional.isEmpty()) return null;

        const data = optional.get().data;
        if (!data) return null;
        if (optional.get().version !== NbtCompound.VERSION) return null;
        return NbtCompound.fromCompactBinary(data);
    }

    public static async loadPlayer(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        const saveName = this.getSaveName(player);
        if (!saveName) return null;

        const uuid: UUID = player.getProfile().clientId;
        const key = [saveName, uuid];
        const result = await this.db.get<PlayerData>('player_data', key);
        const optional = result.ok();
        if (optional.isEmpty()) return null;

        const data = optional.get().data;
        if (!data) return null;
        if (optional.get().version !== NbtCompound.VERSION) return null;
        return NbtCompound.fromCompactBinary(data)
    }

    public static async deleteWorld(saveName: string): Promise<Result<boolean, Error>> {
        const exists = await this.db.get<Save>('saves', saveName);
        if (!exists) return Result.ok(false);

        const db = await this.db.init();
        const {promise, resolve} = Promise.withResolvers<Result<boolean, Error>>();

        const tx = db.transaction(['saves', 'player_data'], 'readwrite');

        tx.objectStore('saves').delete(saveName);

        const playerStore = tx.objectStore('player_data');

        const lowerBound = [saveName];
        const upperBound = [saveName, []];
        const range = IDBKeyRange.bound(lowerBound, upperBound, false, true);

        playerStore.delete(range);

        tx.oncomplete = () => resolve(Result.ok(true));
        tx.onerror = () => resolve(Result.err(IndexedDBHelper.mapErr(tx.error)));

        return promise;
    }

    public static async deletePlayerData(player: ServerPlayerEntity): Promise<boolean> {
        const saveName = this.getSaveName(player);
        if (!saveName) return false;

        const uuid: UUID = player.getProfile().clientId;
        const key = [saveName, uuid];
        const result = await this.db.delete('player_data', key);
        return result
            .mapErr(err => console.error(err))
            .ok()
            .get()
    }

    private static getSaveName(player: ServerPlayerEntity): string | null {
        const server = player.getWorld().getServer();
        if (!server) return null;
        const profile = server.profile;
        if (!profile) return null;

        return profile.name;
    }
}