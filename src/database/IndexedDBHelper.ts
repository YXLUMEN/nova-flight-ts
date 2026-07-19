import {Result} from "../utils/result/Result.ts";
import type {StoreConfig} from "./StoreConfig.ts";

export class IndexedDBHelper {
    private db: IDBDatabase | null = null;
    private readonly dbName: string;
    private readonly version: number;
    private readonly stores: StoreConfig[];

    public constructor(name: string, version: number, stores: StoreConfig[]) {
        this.dbName = name;
        this.version = version;
        this.stores = stores;
    }

    public init(): Promise<IDBDatabase> {
        if (this.db) return Promise.resolve(this.db);

        const {promise, resolve, reject} = Promise.withResolvers<IDBDatabase>();
        const request = indexedDB.open(this.dbName, this.version);

        request.onupgradeneeded = () => {
            const db = request.result;
            const tx = request.transaction!;

            for (const config of this.stores) {
                if (!db.objectStoreNames.contains(config.name)) {
                    this.createStore(db, config);
                    continue;
                }

                const oldStore = tx.objectStore(config.name);
                if (this.isStoreOutdated(oldStore, config)) {
                    db.deleteObjectStore(config.name);
                    this.createStore(db, config);
                }
            }
        };

        request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
        };

        request.onerror = () => reject(request.error);

        return promise;
    }

    private createStore(db: IDBDatabase, config: StoreConfig) {
        const objectStore = db.createObjectStore(config.name, {
            keyPath: config.keyPath,
            autoIncrement: config.autoIncrement,
        });

        config.indexes?.forEach(index => {
            objectStore.createIndex(index.name, index.keyPath, {unique: index.unique});
        });
    }

    private isStoreOutdated(oldStore: IDBObjectStore, config: StoreConfig): boolean {
        if ((config.autoIncrement ?? false) !== oldStore.autoIncrement) return true;
        if (!this.keyPathEquals(oldStore.keyPath, config.keyPath)) return true;

        const existingIdx = Array.from(oldStore.indexNames);
        const desiredIdx = config.indexes?.map(i => i.name) ?? [];

        if (desiredIdx.some(n => !existingIdx.includes(n))) return true;
        return existingIdx.some(n => !desiredIdx.includes(n));
    }

    public async add(storeName: string, data: object, key?: IDBValidKey): Promise<Result<IDBValidKey, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<IDBValidKey, Error>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(data, key);
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async push(storeName: string, records: Iterable<object>): Promise<Result<void, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);

        for (const record of records) {
            store.add(record);
        }

        tx.oncomplete = () => resolve(Result.ok(undefined));
        tx.onerror = () => resolve(this.mapErr(tx.error));
        tx.onabort = () => resolve(this.mapErr(tx.error ?? new Error('Transaction aborted')));

        return promise;
    }

    public async get<T>(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<Result<T | null, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T | null, Error>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => {
            resolve(Result.ok(request.result ?? null));
        }
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async exist(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<Result<boolean, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<boolean, Error>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.count(key);

        request.onsuccess = () => resolve(Result.ok(request.result > 0));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async getByIndex<T>(
        storeName: string,
        indexName: string,
        key: IDBValidKey | IDBKeyRange
    ): Promise<Result<T, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T, Error>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.get(key);

        request.onsuccess = () => resolve(Result.ok(request.result ?? null));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async update<T extends object>(storeName: string, data: T, key?: IDBValidKey): Promise<Result<IDBValidKey, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<IDBValidKey, Error>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data, key);
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<Result<void, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve(Result.ok(undefined));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async clearStore(storeName: string): Promise<Result<void, Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<void, Error>>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve(Result.ok(undefined));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public async getAll<T>(storeName: string): Promise<Result<T[], Error>> {
        const db = await this.init();
        const {promise, resolve} = Promise.withResolvers<Result<T[], Error>>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(Result.ok(request.result));
        request.onerror = () => resolve(this.mapErr(request.error));

        return promise;
    }

    public mapErr(error: unknown): Result<never, Error> {
        if (Error.isError(error)) return Result.err(error);
        return Result.err(new Error('Unknown error occurred.', {cause: error}));
    }

    private keyPathEquals(
        oldKey: string | string[] | null,
        cKey: string | string[] | null
    ): boolean {
        if (oldKey === null) return false;

        if (Array.isArray(oldKey) && typeof cKey === 'string') {
            return oldKey.length === 1 && oldKey[0] === cKey;
        }

        if (Array.isArray(oldKey) && Array.isArray(cKey)) {
            return oldKey.length === cKey.length
                && oldKey.every((v, i) => v === cKey[i]);
        }
        return oldKey === cKey;
    }
}