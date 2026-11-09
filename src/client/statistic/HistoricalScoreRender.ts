import type {Consumer} from "../../type/types.ts";
import {HistoricalScore, type ScoreRecord} from "../../statistics/HistoricalScore.ts";
import {empty} from "../../utils/util.ts";
import {randInt} from "../../utils/math/math.ts";
import {toLocalTime} from "../../utils/time.ts";
import {appEvent} from "../../event/EventBus.ts";
import {PageSection} from "../page/PageSection.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";

export class HistoricalScoreRender extends PageSection {
    private readonly cheatPrompt = ['没关就是开了?', '我 {} 没有开挂', '纯绿玩', '小透不是挂', '开了就是开了?', '时间紧任务重'];
    private readonly translates = [
        TranslatableText.of('statistic.score.score'),
        TranslatableText.of('statistic.score.kill_effective'),
        TranslatableText.of('statistic.score.total_survival_time'),
        TranslatableText.of('statistic.score.player_name'),
        TranslatableText.of('statistic.score.world_name'),
        TranslatableText.of('statistic.score.version'),
        TranslatableText.of('statistic.score.record_time'),
        TranslatableText.of('statistic.score.cheat')
    ];
    private refreshText: Consumer<void> = empty;

    public constructor(element: HTMLElement) {
        super(element);
        this.closeOnEscape = true;
    }

    protected override onOpened() {
        this.refreshText();
        this.refreshText = appEvent.on('ui:lang', () => this.render());
        void this.render();
    }

    protected override onClosed() {
        this.root.replaceChildren();
        this.refreshText();
        this.refreshText = empty;
    }

    public async render() {
        const records = await HistoricalScore.getScores();
        if (records.length === 0) return;

        const box = document.createElement('div');
        box.className = 'historical-score-list';
        for (let i = 0, len = records.length; i < len; i++) {
            if (i !== 0) {
                const line = document.createElement('div');
                line.className = 'line';
                box.append(line);
            }

            const record = records[len - 1 - i];
            box.append(this.createItem(record, i));
        }
        this.root.replaceChildren(box);
    }

    private createItem(record: ScoreRecord, index: number): HTMLElement {
        const root = document.createElement('div');
        root.className = 'historical-score-item';

        const spawn = document.createElement('span');
        spawn.className = 'index';
        spawn.textContent = String(index + 1);
        root.append(spawn);

        this.appendSubitem(root, this.translates[0], record.score);
        this.appendSubitem(root, this.translates[1], `${record.killEffective} score/s`);
        this.appendSubitem(root, this.translates[2], `${record.totalSurvivalTime}s`);
        this.appendSubitem(root, this.translates[3], record.playerName);
        this.appendSubitem(root, this.translates[4], record.worldName);
        this.appendSubitem(root, this.translates[5], record.version);
        this.appendSubitem(root, this.translates[6], toLocalTime(record.recordTime));
        if (record.devMode) {
            const prompt = this.cheatPrompt[randInt(0, this.cheatPrompt.length - 1)]
                .replace('{}', record.playerName);
            this.appendSubitem(root, this.translates[7], prompt);
        }

        return root;
    }

    private appendSubitem(root: HTMLElement, subtitle: TranslatableText, value: string | number | undefined): void {
        const div = document.createElement("div");
        div.className = 'subtitle';
        div.textContent = subtitle.toString();
        const valueElement = document.createElement("div");
        valueElement.textContent = value === undefined ? 'Null' : value.toString();
        root.append(div, valueElement);
    }
}