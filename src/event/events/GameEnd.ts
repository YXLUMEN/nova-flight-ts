import {GameEvent} from "./GameEvent.ts";

export class GameEnd extends GameEvent {
    public constructor() {
        super('game:end');
    }
}