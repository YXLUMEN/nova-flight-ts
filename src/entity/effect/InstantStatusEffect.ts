import {StatusEffect} from "./StatusEffect.ts";

export class InstantStatusEffect extends StatusEffect {
    public override isInstant(): boolean {
        return true;
    }

    public override canApplyUpdateEffect(duration: number, _amplifier: number): boolean {
        return duration >= 1;
    }
}