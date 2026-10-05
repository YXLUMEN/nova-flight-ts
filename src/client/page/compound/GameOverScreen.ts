import type {Consumer} from "../../../type/types.ts";
import {type GuiText, textOf} from "../types.ts";
import {assert} from "../../../utils/dom_util.ts";
import {PageSection} from "../PageSection.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class GameOverScreen extends PageSection {
    private readonly summary: HTMLElement;
    private readonly ctrl = new AbortController();

    public constructor(callback: Consumer<void>) {
        super('game-over-screen', false);

        this.summary = assert(this.root, '.summary');

        assert(this.root, '.title').textContent = TranslatableText.of('hud.game_over').toString();

        const button = assert(this.root, '.c-button');
        button.textContent = TranslatableText.of('hud.back').toString();
        button.addEventListener('click', () => {
            this.close();
            callback();
        }, {once: true, signal: this.ctrl.signal});
    }

    protected override onDestroy() {
        this.ctrl.abort();
    }

    public setSummary(text: GuiText) {
        this.summary.textContent = textOf(text);
    }
}