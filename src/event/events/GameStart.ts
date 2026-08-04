import {GameEvent} from "./GameEvent.ts";

export class GameStart extends GameEvent {
    public constructor() {
        super('game:start');
    }
}