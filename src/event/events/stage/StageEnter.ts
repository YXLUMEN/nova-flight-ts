import type {ServerWorld} from "../../../server/ServerWorld.ts";
import {GameEvent} from "../GameEvent.ts";

export class StageEnter extends GameEvent {
    public readonly world: ServerWorld;
    public readonly name: string;

    public constructor(world: ServerWorld, name: string) {
        super('world:stage:enter');
        this.world = world;
        this.name = name;
    }
}