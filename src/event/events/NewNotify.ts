import {GameEvent} from "./GameEvent.ts";
import type {TranslatableText} from "../../i18n/TranslatableText.ts";

export class NewNotify extends GameEvent {
    public readonly text: TranslatableText | string;
    public readonly duration?: number;
    public readonly fadeTime?: number;

    public constructor(text: TranslatableText | string, duration?: number, fadeTime?: number) {
        super('ui:new:notify');
        this.text = text;
        this.duration = duration;
        this.fadeTime = fadeTime;
    }
}