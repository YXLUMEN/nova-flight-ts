import type {Consumer} from "../../../type/types.ts";
import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import {assert, bindFrom, closest, dataAction} from "../../../utils/dom_util.ts";
import {appEvent} from "../../../event/EventBus.ts";
import {PageSection} from "../PageSection.ts";
import {StartScreenStarfield} from "./StartScreenStarfield.ts";

export class StartScreen extends PageSection implements EventListenerObject {
    private readonly actions: HTMLElement;

    private readonly waitConfirm: Promise<StartAction>;
    private readonly complete: Consumer<StartAction>;
    private readonly starField: StartScreenStarfield;

    public constructor(client: NovaFlightClient, version: string) {
        super('start-screen', false);

        this.starField = new StartScreenStarfield(client, assert(this.root, '.start-menu'));
        this.actions = assert(this.root, '.start-actions');

        // 标题一次性设置
        assert(this.root, '.title').textContent = `Nova Flight (${version})`;
        const binds = bindFrom(this.root);
        const disposer = appEvent.on('ui:lang', () => binds.refresh());

        const {promise, resolve} = Promise.withResolvers<StartAction>();
        this.waitConfirm = promise;
        this.complete = (action: StartAction) => {
            resolve(action);
            disposer();
            this.starField.destroy();
            this.close();
        };

        binds.refresh();
    }

    public wait() {
        return this.waitConfirm;
    }

    public handleEvent(event: Event) {
        if (event.type !== 'click') return;

        const element = closest(event.target, '.c-button');
        const action = dataAction(element);
        if (!action) return;
        this.complete(action as StartAction);
    }

    protected override onOpened() {
        this.actions.removeEventListener('click', this);
        this.actions.addEventListener('click', this);
        this.starField.start();
    }

    protected override onClosed() {
        this.actions.removeEventListener('click', this);
    }

    protected override onDestroy() {
        this.complete('noop');
    }
}

export type StartAction = 'noop' | 'start' | 'multiplayer' | 'statistic' | 'exit';
