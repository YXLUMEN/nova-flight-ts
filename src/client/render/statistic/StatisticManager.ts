import type {StatisticItem} from "./StatisticItem.ts";
import {HistoricalScoreRender} from "./HistoricalScoreRender.ts";

export class StatisticManager {
    private readonly statisticItems = new Map<string, StatisticItem>();

    private readonly statistic: HTMLElement;
    private readonly dir: HTMLElement;
    private readonly displayer: HTMLElement;
    private readonly backBtn: HTMLElement;

    private currentDisplay: HTMLElement | null = null;

    public constructor() {
        this.statistic = document.getElementById('statistic')!;
        this.dir = document.getElementById('statistic-directory')!;
        this.displayer = document.getElementById('statistic-displayer')!;
        this.backBtn = document.getElementById('statistic-back')!;

        this.registry();
    }

    public selectItem() {
        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();

        this.show();

        this.dir.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const name = target.dataset.name;
            if (!name) return;

            const item = this.statisticItems.get(name);
            if (!item) return;
            item.render()
                .then(element => this.displayItem(element));
        }, {signal: ctrl.signal});

        this.backBtn.addEventListener('click', () => {
            this.displayer.classList.add('hidden');
            this.dir.classList.remove('hidden');
            this.displayer.textContent = '';

            if (this.currentDisplay) {
                this.currentDisplay = null;
                return;
            }

            ctrl.abort();
            resolve();
            this.hide();
        }, {signal: ctrl.signal});

        return promise;
    }

    private displayItem(element: HTMLElement): void {
        this.displayer.replaceChildren(element);
        this.currentDisplay = element;

        this.dir.classList.add('hidden');
        this.displayer.classList.remove('hidden');
    }

    public show() {
        this.statistic.classList.remove('hidden');
    }

    public hide() {
        this.statistic.classList.add('hidden');
    }

    private registry() {
        this.statisticItems.set('historical-score', new HistoricalScoreRender());
    }
}