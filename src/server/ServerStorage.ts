import {IndexedDBHelper} from "../database/IndexedDBHelper.ts";
import {NbtCompound} from "../nbt/NbtCompound.ts";
import type {Predicate, UUID} from "../apis/types.ts";
import type {ServerPlayerEntity} from "./entity/ServerPlayerEntity.ts";
import {Result} from "../utils/result/Result.ts";
import type {PlayerData, Save, SaveMeta} from "../apis/Saves.ts";
import {NbtSerialization} from "../nbt/NbtSerialization.ts";
import {NbtUnserialization} from "../nbt/NbtUnserialization.ts";

export class ServerStorage {
    public static readonly db = new IndexedDBHelper('nova-flight-server', 5, [
        {
            name: 'saves',
            keyPath: 'save_name'
        },
        {
            name: 'save_meta',
            keyPath: 'save_name',
        },
        {
            name: 'player_data',
            keyPath: ['save_name', 'uuid'],
        },
        {
            name: 'user_info',
            keyPath: 'name',
        }
    ]);

    public static async insertWorld(saveName: string): Promise<Result<void, Error>> {
        const db = await this.db.init();
        const tx = db.transaction('save_meta', 'readwrite');
        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

        const store = tx.objectStore('save_meta');
        const request = store.add({
            save_name: saveName,
            display_name: saveName,
            version: NbtCompound.VERSION,
            timestamp: Date.now()
        } satisfies SaveMeta);
        request.onsuccess = () => resolve(Result.ok(undefined));
        request.onerror = () => resolve(Result.err(this.mapErr(request.error)));

        return promise;
    }

    public static async updateWorld(saveName: string, compound: NbtCompound) {
        const db = await this.db.init();
        const tx = db.transaction(['save_meta', 'saves'], 'readwrite');

        const metaTask = new Promise<Error | void>((resolve) => {
            const store = tx.objectStore('save_meta');
            const request = store.put({
                save_name: saveName,
                display_name: saveName,
                version: NbtCompound.VERSION,
                timestamp: Date.now()
            } satisfies SaveMeta);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const metaError = await metaTask;
        if (metaError) {
            tx.abort();
            console.error(metaError);
            return;
        }

        const saveTask = new Promise<Error | void>((resolve) => {
            const store = tx.objectStore('saves');
            const request = store.put({
                save_name: saveName,
                data: NbtSerialization.toCompactBinary(compound),
                version: NbtCompound.VERSION,
            } satisfies Save);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const saveError = await saveTask;
        if (saveError) {
            tx.abort();
            console.error(saveError);
        }
    }

    public static async savePlayer(player: ServerPlayerEntity): Promise<void> {
        const saveName = this.getSaveName(player);
        if (!saveName) return;

        const uuid: UUID = player.getUUID();
        const compound = new NbtCompound();
        player.writeNBT(compound);

        const result = await this.db.update('player_data', {
            save_name: saveName,
            uuid,
            data: NbtSerialization.toCompactBinary(compound),
            version: NbtCompound.VERSION
        } satisfies PlayerData);

        if (result.isErr()) {
            console.error(result.unwrapErr());
        }
    }

    public static async loadWorld(saveName: string): Promise<NbtCompound | null> {
        const result = await this.db.get<Save>('saves', saveName);
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return null;
        }

        const save = result.ok().get();
        if (!save.data || save.data.byteLength === 0 || save.version !== NbtCompound.VERSION) return null;
        return NbtUnserialization.fromRootCompactBinary(save.data);
    }

    public static async loadPlayerInWorld(saveName: string, predicate: Predicate<PlayerData>): Promise<void> {
        const exists = await this.db.exist('save_meta', saveName);
        if (exists.isOk() && !exists.ok().get()) return;

        const db = await this.db.init();
        const {promise, resolve} = Promise.withResolvers<Error | void>();

        const tx = db.transaction('player_data', 'readonly');
        const store = tx.objectStore('player_data');
        const range = IDBKeyRange.lowerBound([saveName]);

        const request = store.openCursor(range);
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
                resolve();
                return;
            }
            const [name] = cursor.key as string[];
            if (name !== saveName) {
                resolve();
                return;
            }

            if (!predicate(cursor.value)) {
                resolve();
                return;
            }
            cursor.continue();
        };
        request.onerror = () => resolve(this.mapErr(request.error));

        const isError = await promise;
        if (isError) {
            console.error(isError);
        }
    }

    public static async loadPlayer(player: ServerPlayerEntity): Promise<NbtCompound | null> {
        const saveName = this.getSaveName(player);
        if (!saveName) return null;

        const uuid: UUID = player.getProfile().clientId;

        const result = await this.db.get<PlayerData>('player_data', [saveName, uuid]);
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return null;
        }

        const data = result.ok().get();
        if (!data.data || data.data.byteLength === 0 || data.version !== NbtCompound.VERSION) return null;
        return NbtUnserialization.fromRootCompactBinary(data.data);
    }

    public static async deleteWorld(saveName: string): Promise<Result<void, Error>> {
        const exists = await this.db.exist('save_meta', saveName);
        if (exists.isOk() && !exists.ok().get()) return Result.ok(undefined);

        const db = await this.db.init();
        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

        const tx = db.transaction(['save_meta', 'saves', 'player_data'], 'readwrite');

        tx.oncomplete = () => resolve(Result.ok(undefined));
        tx.onerror = () => resolve(Result.err(this.mapErr(tx.error)));

        tx.objectStore('save_meta').delete(saveName);
        tx.objectStore('saves').delete(saveName);

        const playerStore = tx.objectStore('player_data');
        const range = IDBKeyRange.lowerBound([saveName]);
        playerStore.delete(range);

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

    private static mapErr(error: unknown) {
        if (error instanceof Error) return error;
        return new Error('Unknown error occurred.');
    }
}