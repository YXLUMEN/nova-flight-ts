import {GameEvent} from "./GameEvent.ts";

export class ChangeLang extends GameEvent {
    public readonly lang: string;

    public constructor(lang: string) {
        super('res:lang');
        this.lang = lang;
    }
}