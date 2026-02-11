import {ClientStorage} from "../client/ClientStorage.ts";

export class HistoricalScore {
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

    public static async getScores(): Promise<ScoreRecord[]> {
        const {promise, resolve} = Promise.withResolvers<ScoreRecord[]>();

        const db = await ClientStorage.db.init();
        const tx = db.transaction('statistics', 'readonly');
        const store = tx.objectStore('statistics');

        const request = store.get('score');
        request.onsuccess = () => resolve(request.result?.records ?? []);
        request.onerror = () => resolve([]);

        return promise;
    }
}

export interface ScoreRecord {
    readonly score: number;
    readonly killEffective: number;
    readonly totalSurvivalTime: number;
    readonly playerName: string;
    readonly worldName: string;
    readonly version: string;
    readonly recordTime: number;
    readonly devMode: boolean;
}