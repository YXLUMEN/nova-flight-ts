import {GameEvent} from "../GameEvent.ts";

export class LangChange extends GameEvent {
    public readonly lang: string;

    public constructor(lang: string) {
        super('ui:lang');
        this.lang = lang;
    }
}