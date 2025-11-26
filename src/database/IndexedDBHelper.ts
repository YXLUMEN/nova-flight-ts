import type {StoreConfig} from "../apis/types.ts";

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
            for (const store of this.stores) {
                if (db.objectStoreNames.contains(store.name)) continue;

                const objectStore = db.createObjectStore(store.name, {
                    keyPath: store.keyPath,
                    autoIncrement: store.autoIncrement,
                });

                store.indexes?.forEach(index => {
                    objectStore.createIndex(index.name, index.keyPath, {unique: index.unique});
                });
            }
        };

        request.onsuccess = () => {
            this.db = request.result;
            resolve(this.db);
        };

        request.onerror = () => reject(request.error);

        return promise;
    }

    public async add(storeName: string, data: object): Promise<IDBValidKey> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<IDBValidKey>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        return promise;
    }

    public async get<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<T | null>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);

        return promise;
    }

    public async getByIndex<T>(
        storeName: string,
        indexName: string,
        key: IDBValidKey
    ): Promise<T | null> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<T | null>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const index = store.index(indexName);
        const request = index.get(key);

        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);

        return promise;
    }

    public async update(storeName: string, data: object): Promise<IDBValidKey> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<IDBValidKey>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        return promise;
    }

    public async delete(storeName: string, key: IDBValidKey | IDBKeyRange): Promise<boolean> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<boolean>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);

        return promise;
    }

    public async clearStore(storeName: string): Promise<void> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<void>();

        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);

        return promise;
    }

    public async getAll<T>(storeName: string): Promise<T[]> {
        const db = await this.init();
        const {promise, resolve, reject} = Promise.withResolvers<any>();

        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);

        return promise;
    }
}