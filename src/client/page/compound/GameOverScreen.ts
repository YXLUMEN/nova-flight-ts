import type {Consumer} from "../../../type/types.ts";
import {type GuiText, textOf} from "../types.ts";
import {PageSection} from "../PageSection.ts";
import {TranslatableText} from "../../../i18n/TranslatableText.ts";

/** 一次性使用 */
export class GameOverScreen extends PageSection {
    private readonly summary: HTMLElement;
    private readonly ctrl = new AbortController();

    public constructor(callback: Consumer<void>) {
        super('game-over-screen');

        this.summary = this.assert(this.root, '.summary');

        this.assert(this.root, '.title').textContent = TranslatableText.of('hud.game_over').toString();

        const button = this.assert(this.root, '.c-button');
        button.textContent = TranslatableText.of('hud.back').toString();
        button.addEventListener('click', () => {
            this.close();
            callback();
        }, {once: true, signal: this.ctrl.signal});
    }

    public override close() {
        super.close();
        this.ctrl.abort();
    }

    public setSummary(text: GuiText) {
        this.summary.textContent = textOf(text);
    }
}