import {GameEvent} from "./GameEvent.ts";

export class DifficultChange extends GameEvent {
    public readonly difficult: number;

    public constructor(difficult: number) {
        super('world:stage:difficult');
        this.difficult = difficult;
    }
}