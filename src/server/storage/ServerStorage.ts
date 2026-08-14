import {IndexedDBHelper} from "../../database/IndexedDBHelper.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {Result} from "../../utils/result/Result.ts";
import type {MetaStatus, Save, SaveMeta} from "../../type/Saves.ts";
import {NbtSerialization} from "../../nbt/NbtSerialization.ts";
import {NbtUnserialization} from "../../nbt/NbtUnserialization.ts";
import {NoResultsError, StatusError, VersionError} from "../../type/errors.ts";
import {DEFAULT_CONFIG} from "../../configs/GlobalConfig.ts";
import {compress, decompress} from "@bokuweb/zstd-wasm";

export class ServerStorage {
    public static readonly db = new IndexedDBHelper('nova-flight-server', 6, [
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
            format_version: NbtCompound.VERSION,
            game_version: DEFAULT_CONFIG.gameVersion,
            timestamp: Temporal.Now.instant().epochMilliseconds,
            status: 'pending',
        } satisfies SaveMeta);
        request.onsuccess = () => resolve(Result.ok(undefined));
        request.onerror = () => resolve(Result.err(this.mapErr(request.error)));

        return promise;
    }

    public static async updateWorld(saveName: string, compound: NbtCompound, status: MetaStatus = 'available'): Promise<Result<void, Error>> {
        const db = await this.db.init();
        const tx = db.transaction(['save_meta', 'saves'], 'readwrite');

        const metaTask = new Promise<void | Error>((resolve) => {
            const store = tx.objectStore('save_meta');
            const request = store.put({
                save_name: saveName,
                display_name: saveName,
                format_version: NbtCompound.VERSION,
                game_version: DEFAULT_CONFIG.gameVersion,
                timestamp: Temporal.Now.instant().epochMilliseconds,
                status: status,
            } satisfies SaveMeta);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const metaError = await metaTask;
        if (metaError) {
            tx.abort();
            return Result.err(metaError);
        }

        const saveTask = new Promise<void | Error>((resolve) => {
            const store = tx.objectStore('saves');
            const raw = NbtSerialization.toCompactBinary(compound);
            const data = compress(raw, 7) as Uint8Array<ArrayBuffer>;

            const request = store.put({
                save_name: saveName,
                data
            } satisfies Save);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const saveError = await saveTask;
        if (saveError) {
            tx.abort();
            return Result.err(saveError);
        }

        return Result.ok(undefined);
    }

    public static async loadWorld(saveName: string): Promise<Result<NbtCompound, Error>> {
        const db = await this.db.init();
        const tx = db.transaction(['save_meta', 'saves'], 'readonly');

        const metaTask = new Promise<SaveMeta | Error>((resolve) => {
            const store = tx.objectStore('save_meta');
            const request = store.get(saveName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const meta = await metaTask;
        if (Error.isError(meta)) {
            return Result.err(meta);
        }

        if (meta.format_version !== NbtCompound.VERSION) {
            return Result.err(new VersionError(`Current target version is "${meta.format_version}", but require "${NbtCompound.VERSION}".`));
        }

        if (meta.status === 'broken' || meta.status === 'pending') {
            return Result.err(new StatusError('Status exception', {cause: meta.status}));
        }

        const saveTask = new Promise<Save | Error>((resolve) => {
            const store = tx.objectStore('saves');
            const request = store.get(saveName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const save = await saveTask;
        if (Error.isError(save)) {
            return Result.err(save);
        }

        if (save.data.length === 0) {
            return Result.err(new NoResultsError());
        }

        try {
            const data = decompress(save.data) as Uint8Array<ArrayBuffer>;
            const compound = NbtUnserialization.fromCompactBinary(data);
            return Result.ok(compound);
        } catch (err) {
            return Result.err(this.mapErr(err));
        }
    }

    public static async deleteWorld(saveName: string): Promise<Result<void, Error>> {
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

    public static checkMetaStatus(save: SaveMeta) {
        let status = save.status;
        if (save.game_version !== DEFAULT_CONFIG.gameVersion) {
            status = 'outdated';
        }

        if (save.format_version !== NbtCompound.VERSION) {
            status = 'broken';
        }

        return status;
    }

    public static async updateStatus() {
        const {promise, resolve} = Promise.withResolvers<void>();

        const db = await this.db.init();
        const tx = db.transaction('save_meta', 'readwrite');
        const store = tx.objectStore('save_meta');

        const request = store.openCursor();
        request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) {
                resolve();
                return;
            }

            const meta = cursor.value as SaveMeta;
            meta.status = this.checkMetaStatus(meta);
            cursor.update(meta);
            cursor.continue();
        };
        request.onerror = () => resolve();

        return promise;
    }

    private static mapErr(error: unknown) {
        if (Error.isError(error)) return error;
        return new Error('Unknown error occurred.');
    }
}