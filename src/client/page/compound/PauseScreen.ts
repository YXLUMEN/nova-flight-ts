import type {NovaFlightClient} from "../../NovaFlightClient.ts";
import type {TextElement} from "../TextElement.ts";
import {bindTexts, closest, dataAction} from "../../../utils/dom_util.ts";
import {appEvent} from "../../../event/EventBus.ts";
import {PageSection} from "../PageSection.ts";
import {TipManager} from "../../tips/TipManager.ts";

export class PauseScreen extends PageSection implements EventListenerObject {
    private readonly client: NovaFlightClient;
    private readonly ctrl = new AbortController();
    private readonly elements: TextElement<HTMLElement>[];

    public constructor(client: NovaFlightClient) {
        super('pause-screen');

        this.client = client;
        this.elements = bindTexts(this.root, {
            '.pause-tips-body': '',
            '.pause-title': 'pause.paused',
            '.pause-hint': 'pause.press_esc',
            '[data-action="back"]': 'pause.back_to_game',
            '[data-action="save"]': 'pause.save',
            '[data-action="save-and-exit"]': 'pause.save_and_exit',
            '.pause-tips-title': TipManager.title,
        });

        const tipBody = this.elements[0];
        const refresh = () => this.elements.forEach(t => t.refresh());

        appEvent.withSignal('ui:tip', ({text}) => {
            if (text) tipBody.setText(text);
        }, this.ctrl.signal);
        appEvent.withSignal('ui:lang', refresh, this.ctrl.signal);

        refresh();
        const tip = TipManager.get();
        if (tip) tipBody.setText(tip);
    }

    protected override onOpened() {
        this.root.removeEventListener('click', this);
        this.root.addEventListener('click', this);
    }

    protected override onClosed() {
        this.root.removeEventListener('click', this);
    }

    protected override onDestroy() {
        this.ctrl.abort();
    }

    public handleEvent(event: Event): void {
        if (event.type !== 'click') return;

        const element = closest(event.target, '.c-button');
        const action = dataAction(element);
        if (!action) return;

        switch (action) {
            case 'back':
                this.client.setPause(false);
                break;
            case 'save':
                void this.client.saveAll();
                break;
            case 'save-and-exit':
                this.client.leaveGame();
                break;
        }
    }

    public static shouldShow(client: NovaFlightClient): boolean {
        const player = client.player;
        const world = client.world;
        return client.isPause() && world !== null && !world.isOver() &&
            player !== null && !player.isOpenInventory();
    }
}