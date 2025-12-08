import {IndexedDBHelper} from "../database/IndexedDBHelper.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {UUID} from "../apis/types.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {Result} from "../utils/result/Result.ts";

interface Save {
    save_name: string,
    data: Uint8Array<ArrayBufferLike>,
    version: number,
    timestamp: number,
}

interface PlayerData {
    save_name: string,
    uuid: string,
    data: Uint8Array<ArrayBufferLike>,
    version: number,
}

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
        await this.db.update('saves', {
            save_name: saveName,
            data: compound.toBinary(),
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

        await this.db.update('player_data', {
            save_name,
            uuid,
            data: nbt.toBinary(),
            version: NbtCompound.VERSION
        } satisfies PlayerData);
    }

    public static async loadWorld(saveName?: string): Promise<NbtCompound | null> {
        if (saveName) {
            const result = await this.db.get<Save>('saves', saveName);
            const optional = result.ok();
            if (optional.isEmpty()) return null;

            const data = optional.get().data;
            if (!data) return null;
            if (optional.get().version !== NbtCompound.VERSION) return null;
            return NbtCompound.fromBinary(data);
        }

        const result = await this.db.getAll<Save>('saves');
        const optional = result.ok();
        if (optional.isEmpty()) return null;

        if (optional.get().length === 0) return null;

        const latest = optional.get().reduce((prev, curr) =>
            curr.timestamp > prev.timestamp ? curr : prev
        );
        if (latest.version !== NbtCompound.VERSION) return null;
        return NbtCompound.fromBinary(latest.data);
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
        return NbtCompound.fromBinary(data)
    }

    public static async deleteWorld(saveName: string): Promise<Result<boolean, DOMException | null>> {
        const exists = await this.db.get<Save>('saves', saveName);
        if (!exists) return Result.ok(false);

        const db = await this.db.init();
        const {promise, resolve} = Promise.withResolvers<Result<boolean, DOMException | null>>();

        const tx = db.transaction(['saves', 'player_data'], 'readwrite');

        tx.objectStore('saves').delete(saveName);

        const playerStore = tx.objectStore('player_data');

        const lowerBound = [saveName];
        const upperBound = [saveName, []];
        const range = IDBKeyRange.bound(lowerBound, upperBound, false, true);

        playerStore.delete(range);

        tx.oncomplete = () => resolve(Result.ok(true));
        tx.onerror = () => resolve(Result.err(tx.error));

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