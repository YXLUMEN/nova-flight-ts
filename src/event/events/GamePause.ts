import {GameEvent} from "./GameEvent.ts";

export class GamePause extends GameEvent {
    public readonly paused: boolean;

    public constructor(paused: boolean) {
        super('game:pause');
        this.paused = paused;
    }
}