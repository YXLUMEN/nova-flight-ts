import {GameEvent} from "./GameEvent.ts";
import type {Tech} from "../../world/tech/Tech.ts";

export class UnlockTech extends GameEvent {
    public readonly tech: Tech;
    public readonly silent: boolean;

    public constructor(tech: Tech, silent?: boolean) {
        super('player:tech:unlock');
        this.tech = tech;
        this.silent = silent ?? false;
    }
}