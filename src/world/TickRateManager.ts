import {clamp} from "../utils/math/math.ts";

export class TickRateManager {
    protected tps: number = 20;
    protected perTick: number = 1 / 20;
    protected maxStep = 3;

    public constructor(tps: number = 20) {
        this.tps = clamp(tps, 1, 160);
        this.perTick = 1 / this.tps;
    }

    public rate(): number {
        return this.tps;
    }

    public setRate(tps: number) {
        this.tps = clamp(tps, 1, 160);
        this.perTick = 1 / this.tps;
    }

    public spt(): number {
        return this.perTick;
    }

    public getMaxStep(): number {
        return this.maxStep;
    }
}