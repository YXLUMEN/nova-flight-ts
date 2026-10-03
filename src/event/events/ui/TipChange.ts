import {GameEvent} from "../GameEvent.ts";
import type {TranslatableText} from "../../../i18n/TranslatableText.ts";

export class TipChange extends GameEvent {
    public readonly text: TranslatableText | null;

    public constructor(text: TranslatableText | null) {
        super('ui:tip');
        this.text = text;
    }
}