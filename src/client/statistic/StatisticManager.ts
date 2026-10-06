import type {StatisticItem} from "./StatisticItem.ts";
import type {Consumer} from "../../type/types.ts";
import {HistoricalScoreRender} from "./HistoricalScoreRender.ts";
import {error} from "@tauri-apps/plugin-log";
import {message} from "@tauri-apps/plugin-dialog";
import {PageSection} from "../page/PageSection.ts";
import {assert} from "../../utils/dom_util.ts";
import {empty} from "../../utils/uit.ts";

export class StatisticManager extends PageSection {
    private readonly statisticItems = new Map<string, StatisticItem>();

    private readonly dir: HTMLElement;
    private readonly displayer: HTMLElement;
    private readonly backBtn: HTMLElement;

    private currentDisplay: HTMLElement | null = null;
    private commit: Consumer<void> = empty;

    public constructor() {
        super('statistic');

        this.dir = assert(this.root, '#statistic-directory');
        this.displayer = assert(this.root, '#statistic-displayer');
        this.backBtn = assert(this.root, '#statistic-back');

        this.registry();
    }

    protected override onClosed() {
        this.commit();
        this.commit = empty;
    }

    public selectItem() {
        this.commit();

        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();

        const commit = () => {
            ctrl.abort();
            resolve();
            this.commit = empty;
            this.close();
        }
        this.commit = commit;

        this.dir.addEventListener('click', event => {
            const target = event.target as HTMLElement;
            const name = target.dataset.name;
            if (!name) return;

            const item = this.statisticItems.get(name);
            if (!item) return;

            item.render()
                .then(element => this.displayItem(element))
                .catch(err => {
                    message('出错啦,详细情况请查看日志').catch();
                    error(String(err)).catch();
                });
        }, {signal: ctrl.signal});

        this.backBtn.addEventListener('click', () => {
            this.displayer.classList.add('hidden');
            this.dir.classList.remove('hidden');
            this.displayer.textContent = '';

            if (this.currentDisplay) {
                this.currentDisplay = null;
                return;
            }

            commit();
        }, {signal: ctrl.signal});

        return promise;
    }

    private displayItem(element: HTMLElement): void {
        this.displayer.replaceChildren(element);
        this.currentDisplay = element;

        this.dir.classList.add('hidden');
        this.displayer.classList.remove('hidden');
    }

    private registry() {
        this.statisticItems.set('historical-score', new HistoricalScoreRender());
    }
}