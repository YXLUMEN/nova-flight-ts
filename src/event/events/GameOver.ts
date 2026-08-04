import {GameEvent} from "./GameEvent.ts";

export class GameOver extends GameEvent {
    public constructor() {
        super('game:over');
    }
}