import type {Identifier} from "../registry/Identifier.ts";

export class SoundEvent {
    private readonly id: Identifier;
    // private readonly distanceToTravel: number;
    // private readonly staticDistance: boolean;

    private constructor(id: Identifier) {
        this.id = id;
    }

    public static of(id: Identifier): SoundEvent {
        return new SoundEvent(id);
    }

    public getId(): Identifier {
        return this.id;
    }
}