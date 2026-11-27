import {IndexedDBHelper} from "../../database/IndexedDBHelper.ts";

export class ServerStorage {
    public static readonly DB = new IndexedDBHelper('nova-flight-server', 7, [
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
            name: 'account',
            keyPath: 'uuid',
        },
        {
            name: 'user_info',
            keyPath: 'name',
        }
    ]);
}