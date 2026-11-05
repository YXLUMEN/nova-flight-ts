import type {World} from "../../../world/World.ts";
import {GameEvent} from "../GameEvent.ts";

export class StageEnter extends GameEvent {
    public readonly world: World;
    public readonly name: string;

    public constructor(world: World, name: string) {
        super('world:stage:enter');
        this.world = world;
        this.name = name;
    }
}