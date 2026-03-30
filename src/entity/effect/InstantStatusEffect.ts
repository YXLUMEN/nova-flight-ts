import {StatusEffect} from "./StatusEffect.ts";

export class InstantStatusEffect extends StatusEffect {
    public override isInstant(): boolean {
        return true;
    }

    public override shouldApplyThisTick(duration: number, _amplifier: number): boolean {
        return duration >= 1;
    }
}