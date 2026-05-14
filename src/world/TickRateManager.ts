export class TickRateManager {
    protected tickRate: number = 20;
    protected msPerTick: number = 1 / 20;
    protected maxStep = 3;

    public constructor(rate: number = 20) {
        this.tickRate = Math.max(1, rate);
        this.msPerTick = 1 / this.tickRate;
    }

    public getRate() {
        return this.tickRate;
    }

    public perTick() {
        return this.msPerTick;
    }

    public getMaxStep() {
        return this.maxStep;
    }
}