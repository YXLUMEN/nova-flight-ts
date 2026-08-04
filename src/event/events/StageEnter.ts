import {GameEvent} from "./GameEvent.ts";

export class StageEnter extends GameEvent {
    public readonly name: string;

    public constructor(name: string) {
        super('world:stage:enter');
        this.name = name;
    }
}