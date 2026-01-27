import type {World} from "../World.ts";
import type {WorldEventType} from "./WorldEventType.ts";

export interface WorldEvent {
    tick(world: World): void;

    emit(world: World): void;

    cancel(): void;

    isDestroyed(): boolean;

    getType(): WorldEventType<any>;
}