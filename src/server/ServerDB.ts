import {IndexedDBHelper} from "../database/IndexedDBHelper.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {UUID} from "../apis/types.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";

interface Save {
    save_name: string,
    data: Uint8Array<ArrayBufferLike>,
    timestamp: number,
}

interface PlayerData {
    save_name: string,
    uuid: string,
    data: Uint8Array<ArrayBufferLike>,
}

export class ServerDB {
    public static db = new IndexedDBHelper('nova-flight-server', 1, [
        {
            name: 'saves',
            keyPath: 'save_name',
        },
        {
            name: 'player_data',
            keyPath: ['save_name', 'uuid'],
        }
    ]);

    public static async saveWorld(saveName: string, compound: NbtCompound): Promise<void> {
        await this.db.update('saves', {
            save_name: saveName,
            data: compound.toBinary(),
            timestamp: Date.now(),
        } satisfies Save);
    }

    public static async savePlayer(player: ServerPlayerEntity): Promise<void> {
        const save_name = this.getSaveName(player);
        if (!save_name) return;
        const uuid: UUID = player.getUUID();

        const nbt = new NbtCompound();
        player.writeNBT(nbt);

        await this.db.update('player_data', {
            save_name,
            uuid,
            data: nbt.toBinary(),
        } satisfies PlayerData);
    }

    public static async loadWorld(saveName?: string): Promise<NbtCompound | null> {
        if (saveName) {
            const record = await this.db.get<Save>('saves', saveName);
            const data = record?.data;
            if (!data) return null;
            return NbtCompound.fromBinary(data);
        }

        const allSaves = await this.db.getAll<Save>('saves');
        if (allSaves.length === 0) return null;

        const latest = allSaves.reduce((prev, curr) =>
            curr.timestamp > prev.timestamp ? curr : prev
        );
        return NbtCompound.fromBinary(latest.data);
    }

    public static async loadPlayer(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        const saveName = this.getSaveName(player);
        if (!saveName) return null;

        const uuid: UUID = player.getProfile().clientId;
        const key = [saveName, uuid];
        const playerData = await this.db.get<PlayerData>('player_data', key);

        const data = playerData?.data;
        if (!data) return null;
        return NbtCompound.fromBinary(data)
    }

    public static async deleteWorld(saveName: string): Promise<boolean> {
        const exists = await this.db.get<Save>('saves', saveName);
        if (!exists) return false;

        const db = await this.db.init();
        const {promise, resolve, reject} = Promise.withResolvers<boolean>();

        const tx = db.transaction(['saves', 'player_data'], 'readwrite');

        tx.objectStore('saves').delete(saveName);

        const playerStore = tx.objectStore('player_data');

        const lowerBound = [saveName];
        const upperBound = [saveName, []];
        const range = IDBKeyRange.bound(lowerBound, upperBound, false, true);

        playerStore.delete(range);

        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);

        return promise;
    }

    public static async deletePlayerData(player: ServerPlayerEntity): Promise<boolean> {
        const saveName = this.getSaveName(player);
        if (!saveName) return false;

        const uuid: UUID = player.getProfile().clientId;
        const key = [saveName, uuid];
        return await this.db.delete('player_data', key);
    }

    private static getSaveName(player: ServerPlayerEntity): string | null {
        const server = player.getWorld().getServer();
        if (!server) return null;
        const profile = server.profile;
        if (!profile) return null;

        return profile.name;
    }
}