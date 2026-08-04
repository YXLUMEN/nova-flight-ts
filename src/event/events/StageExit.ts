import {GameEvent} from "./GameEvent.ts";

export class StageExit extends GameEvent {
    public readonly name: string;

    public constructor(name: string) {
        super('world:stage:exit');
        this.name = name;
    }
}