import {HistoricalScore, type ScoreRecord} from "../../../statistics/HistoricalScore.ts";
import type {StatisticItem} from "./StatisticItem.ts";
import {randInt} from "../../../utils/math/math.ts";

export class HistoricalScoreRender implements StatisticItem {
    private static readonly cheatPrompt = ['没关就是开了?', '我 {} 没有开挂', '纯绿玩', '小透不是挂'];

    public async render() {
        const records = await HistoricalScore.getScores();
        const box = document.createElement("div");
        box.className = 'historical-score-list';

        if (records.length === 0) return box;
        for (let i = 0, len = records.length; i < len; i++) {
            if (i !== 0) {
                const line = document.createElement("div");
                line.className = 'line';
                box.append(line);
            }

            const record = records[len - 1 - i];
            box.append(this.createItem(record, i));
        }
        return box;
    }

    private createItem(record: ScoreRecord, index: number): HTMLElement {
        const root = document.createElement("div");
        root.className = 'historical-score-item';

        const spawn = document.createElement('span');
        spawn.className = 'index';
        spawn.textContent = (index + 1).toString();
        root.append(spawn);

        this.appendSubitem(root, '分数', record.score.toString());
        this.appendSubitem(root, '击杀效率', `${record.killEffective} score/s`);
        this.appendSubitem(root, '存活时长', `${record.totalSurvivalTime}s`);
        this.appendSubitem(root, '玩家名称', record.playerName);
        this.appendSubitem(root, '存档名称', record.worldName);
        this.appendSubitem(root, '游戏版本', record.version);
        this.appendSubitem(root, '记录时间', new Date(record.recordTime).toLocaleString());
        if (record.devMode) {
            const prompt = HistoricalScoreRender.cheatPrompt[randInt(0, HistoricalScoreRender.cheatPrompt.length - 1)]
                .replace('{}', record.playerName);
            this.appendSubitem(root, '开了', prompt);
        }

        return root;
    }

    private appendSubitem(root: HTMLElement, subtitle: string, value: string): void {
        const div = document.createElement("div");
        div.className = 'subtitle';
        div.textContent = subtitle;
        const valueElement = document.createElement("div");
        valueElement.textContent = value.toString();
        root.append(div, valueElement);
    }

    public getName(): string {
        return 'historical-score';
    }
}