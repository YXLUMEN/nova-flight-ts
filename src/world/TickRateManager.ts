import {clamp} from "../utils/math/math.ts";

export class TickRateManager {
    protected tickRate: number = 20;
    protected msPerTick: number = 1 / 20;
    protected maxStep = 3;

    public constructor(rate: number = 20) {
        this.tickRate = clamp(rate, 1, 256);
        this.msPerTick = 1 / this.tickRate;
    }

    public getRate(): number {
        return this.tickRate;
    }

    public mspt(): number {
        return this.msPerTick;
    }

    public getMaxStep(): number {
        return this.maxStep;
    }

    public setRate(rate: number) {
        this.tickRate = clamp(rate, 1, 256);
        this.msPerTick = 1 / this.tickRate;
    }
}