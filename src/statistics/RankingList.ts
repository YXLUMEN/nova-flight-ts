import {ClientStorage} from "../client/ClientStorage.ts";

export class RankingList {
    public static async recordScore(record: ScoreRecord) {
        const {promise, resolve} = Promise.withResolvers<void>();

        const db = await ClientStorage.db.init();
        const tx = db.transaction('statistics', 'readwrite');
        const store = tx.objectStore('statistics');

        const request = store.get('score');
        request.onsuccess = () => {
            const records: ScoreRecord[] = request.result?.records ?? [];
            records.push(record);
            if (records.length > 32) records.shift();

            const update = store.put({
                item: 'score',
                records
            });
            update.onsuccess = () => resolve();
        }

        tx.onerror = () => resolve();

        return promise;
    }
}

type ScoreRecord = {
    readonly score: number;
    killEffective: number;
    totalSurvivalTime: number;
    readonly playerName: string;
    readonly worldName: string;
    readonly gameVersion: number;
    readonly recordTime: string;
    readonly devMode: boolean;
}