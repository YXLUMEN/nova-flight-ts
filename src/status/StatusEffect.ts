import type {Entity} from "../entity/Entity.ts";

export abstract class StatusEffect {
    protected constructor() {
    }

    public applyUpdateEffect(_entity: Entity, _amplifier: number): boolean {
        return false;
    };

    public canApplyUpdateEffect(_duration: number, _amplifier: number): boolean {
        return false;
    };
}