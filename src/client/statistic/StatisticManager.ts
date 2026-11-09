import type {Consumer} from "../../type/types.ts";
import {message} from "@tauri-apps/plugin-dialog";
import {assert, bindFrom} from "../../utils/dom_util.ts";
import {empty} from "../../utils/util.ts";
import {appEvent} from "../../event/EventBus.ts";
import {HistoricalScoreRender} from "./HistoricalScoreRender.ts";
import {PageSection} from "../page/PageSection.ts";
import {Log} from "../../worker/log.ts";
import {TranslatableText} from "../../i18n/TranslatableText.ts";

export class StatisticManager extends PageSection {
    private readonly statisticItems = new Map<string, PageSection>();

    private readonly dir: HTMLElement;
    private readonly displayer: HTMLElement;
    private readonly backBtn: HTMLElement;

    private commit: Consumer<void> = empty;

    public constructor() {
        super('statistic');

        this.closeOnEscape = true;

        this.dir = assert(this.root, '#statistic-directory');
        this.displayer = assert(this.root, '#statistic-displayer');
        this.backBtn = assert(this.root, '#statistic-back');

        const bind = bindFrom(this.root);
        appEvent.on('ui:lang', () => bind.refresh());
        bind.refresh();

        this.registry();
    }

    protected override onClosed() {
        this.commit();
        this.commit = empty;
        this.displayer.replaceChildren();
    }

    public override focus() {
        super.focus();
        this.dir.classList.remove('hidden');
    }

    public selectItem(): Promise<void> {
        this.commit();

        const gui = this.manager;
        if (!gui) return Promise.resolve();

        let top: PageSection | null = null;
        const {promise, resolve} = Promise.withResolvers<void>();
        const ctrl = new AbortController();

        const commit = () => {
            ctrl.abort();
            resolve();
            top = null;
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

            try {
                top?.close();
                top = gui.open(item);
                this.dir.classList.add('hidden');
            } catch (err) {
                void message(TranslatableText.of('statistic.child.err').asString());
                Log.error(`Error occurrence when display statistic:\n  ${err}`);
            }
        }, {signal: ctrl.signal});

        this.backBtn.addEventListener('click', () => {
            if (!top) {
                commit();
                return;
            }

            top.close();
            top = null;
            return;
        }, {signal: ctrl.signal});

        return promise;
    }

    private registry() {
        this.statisticItems.set('historical-score', new HistoricalScoreRender(this.displayer));
    }
}