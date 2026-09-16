import {StatusEffect} from "./StatusEffect.ts";

export class InstantStatusEffect extends StatusEffect {
    public override isInstant(): boolean {
        return true;
    }

    public override shouldApplyThisTick(tickCount: number): boolean {
        return tickCount >= 1;
    }
}