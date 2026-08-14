import type {GameProfile} from "../entity/GameProfile.ts";
import {Result} from "../../utils/result/Result.ts";
import {NbtCompound} from "../../nbt/element/NbtCompound.ts";
import {NoResultsError, VersionError} from "../../type/errors.ts";
import type {BiConsumer, Consumer, UUID} from "../../type/types.ts";
import type {PlayerData} from "../../type/Saves.ts";
import {IndexedDBHelper} from "../../database/IndexedDBHelper.ts";
import {compress, decompress} from "@bokuweb/zstd-wasm";
import {NbtUnserialization} from "../../nbt/NbtUnserialization.ts";
import type {PlayerEntity} from "../../entity/player/PlayerEntity.ts";
import {NbtSerialization} from "../../nbt/NbtSerialization.ts";
import {DEFAULT_CONFIG} from "../../configs/GlobalConfig.ts";

export class PlayerDataStorage {
    private readonly saveName: string;
    private readonly db: IndexedDBHelper;

    public constructor(saveName: string, db: IndexedDBHelper) {
        this.saveName = saveName;
        this.db = db;
    }

    public async savePlayer(player: PlayerEntity): Promise<Result<void, Error>> {
        const uuid: UUID = player.getUUID();
        const compound = new NbtCompound();
        player.writeNBT(compound);

        return this.savePlayerNbt(uuid, compound);
    }

    public async savePlayerNbt(uuid: UUID, compound: NbtCompound): Promise<Result<void, Error>> {
        const db = await this.db.init();
        const tx = db.transaction(['save_meta', 'player_data'], 'readwrite');
        const saveName = this.saveName;

        const metaExists = await new Promise<boolean>((resolve) => {
            const store = tx.objectStore('save_meta');
            const request = store.getKey(saveName);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });

        if (!metaExists) {
            tx.abort();
            return Result.err(new NoResultsError(`World ${saveName} not found.`));
        }

        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();
        const store = tx.objectStore('player_data');

        const raw = NbtSerialization.toCompactBinary(compound);
        const data = compress(raw, 7) as Uint8Array<ArrayBuffer>;

        const request = store.put({
            save_name: saveName,
            uuid,
            data,
            format_version: NbtCompound.VERSION,
            game_version: DEFAULT_CONFIG.gameVersion,
        } satisfies PlayerData);
        request.onsuccess = () => resolve(Result.ok(undefined));
        request.onerror = () => resolve(Result.err(this.mapErr(request.error)));

        return promise;
    }

    public async loadPlayer(profile: GameProfile): Promise<Result<NbtCompound, Error>> {
        const uuid: UUID = profile.clientId;
        const result = await this.db.get<PlayerData>(
            'player_data',
            [this.saveName, uuid]
        );
        if (result.isErr()) {
            return Result.err(result.unwrapErr());
        }

        const data = result.unwrap();
        if (!data) return Result.err(new NoResultsError());
        return this.playerNbt(data);
    }

    public loadPlayerNbtInWorld(consumer: BiConsumer<UUID, NbtCompound>): Promise<Result<void, Error>> {
        return this.loadPlayerInWorld((player) => {
            const nbt = this.playerNbt(player);
            const ok = nbt.ok();
            if (ok.isPresent()) {
                consumer(player.uuid, ok.get());
            }
        });
    }

    public async loadPlayerInWorld(consumer: Consumer<PlayerData>): Promise<Result<void, Error>> {
        const db = await this.db.init();
        const tx = db.transaction(['save_meta', 'player_data'], 'readonly');
        const saveName = this.saveName;

        const metaTask = new Promise<void | Error>((resolve) => {
            const store = tx.objectStore('save_meta');
            const request = store.get(saveName);
            request.onsuccess = () => resolve();
            request.onerror = () => resolve(this.mapErr(request.error));
        });

        const meta = await metaTask;
        if (meta) {
            return Result.err(meta);
        }

        const {promise, resolve} = Promise.withResolvers<void | Error>();
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
            const playerData = cursor.value as PlayerData;
            playerData.data = decompress(playerData.data) as Uint8Array<ArrayBuffer>;

            consumer(playerData);
            cursor.continue();
        };
        request.onerror = () => resolve(this.mapErr(request.error));

        const error = await promise;
        if (error) {
            return Result.err(error);
        }
        return Result.ok(undefined);
    }

    public async deletePlayerData(profile: GameProfile): Promise<boolean> {
        const uuid: UUID = profile.clientId;
        const result = await this.db.delete(
            'player_data',
            [this.saveName, uuid]
        );
        if (result.isErr()) {
            console.error(result.unwrapErr());
            return false;
        }
        return true;
    }

    private playerNbt(player: PlayerData): Result<NbtCompound, Error> {
        if (!player.data || player.data.length === 0) {
            return Result.err(new NoResultsError());
        }

        if (player.format_version !== NbtCompound.VERSION) {
            return Result.err(new VersionError(`Target version is ${player.format_version}, but require ${NbtCompound.VERSION}.`));
        }

        try {
            const data = decompress(player.data) as Uint8Array<ArrayBuffer>;
            const compound = NbtUnserialization.fromCompactBinary(data);
            return Result.ok(compound);
        } catch (err) {
            return Result.err(this.mapErr(err));
        }
    }

    private mapErr(error: unknown) {
        if (Error.isError(error)) return error;
        return new Error('[PlayerData] Unknown error occurred.');
    }
}