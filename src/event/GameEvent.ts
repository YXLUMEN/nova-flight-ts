import {Registry} from "../registry/Registry.ts";
import {Registries} from "../registry/Registries.ts";
import {Identifier} from "../registry/Identifier.ts";

export class GameEvent {
    public static readonly ENTITY_DIE = this.register('entity_die');
    public static readonly ENTITY_DAMAGE = this.register('entity_damage');
    private static Event = class Event {
        public readonly id: number;

        public constructor(id: number) {
            this.id = id;
        }
    }

    private static register(id: string, range: number = 16) {
        return Registry.registerReferenceById(Registries.GAME_EVENT, Identifier.ofVanilla(id), new GameEvent.Event(range));
    }
}