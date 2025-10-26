import {IndexedDBHelper} from "../database/IndexedDBHelper.ts";

export class ClientDB {
    public static db = new IndexedDBHelper('nova-flight-client', 1, [
        {
            name: 'saves',
            keyPath: 'id',
            autoIncrement: true,
        },
        {
            name: 'server-addr-list',
            keyPath: 'id',
            autoIncrement: true,
            indexes: [
                {name: 'addr_name', keyPath: ['addr', 'name']},
            ]
        }
    ]);

    public static async deleteServer(addr: string, name: string): Promise<void> {
        const db = await this.db.init();

        const tx = db.transaction('server-addr-list', 'readwrite');
        const store = tx.objectStore('server-addr-list');
        const index = store.index('addr_name');

        const range = IDBKeyRange.only([addr, name]);
        const request = index.openCursor(range);

        request.onsuccess = () => {
            const cursor = request.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            }
        };
    }
}