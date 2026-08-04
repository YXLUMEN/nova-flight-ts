import {GameEvent} from "./GameEvent.ts";
import type {RegistryEntry} from "../../registry/tag/RegistryEntry.ts";
import type {Tech} from "../../world/tech/Tech.ts";

export class UnlockTechEntry extends GameEvent {
    public readonly tech: RegistryEntry<Tech>;

    public constructor(tech: RegistryEntry<Tech>) {
        super('player:tech:unlock_entry');
        this.tech = tech;
    }
}