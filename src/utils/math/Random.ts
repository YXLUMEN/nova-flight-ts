export class Random {
    private state: number;

    public constructor(seed: number) {
        this.state = seed || 1;
    }

    public nextFloat(): number {
        let x = this.state;
        x ^= x << 13;
        x ^= x >>> 17;
        x ^= x << 5;
        this.state = x;
        return (x >>> 0) / 4294967296;
    }

    public nextInt(min: number, max: number): number {
        return Math.floor(this.nextFloat() * (max - min + 1)) + min;
    }

    public nextBool(): boolean {
        return this.nextFloat() < 0.5;
    }

    public nextDouble(): number {
        return this.nextFloat();
    }

    public setState(state: number) {
        this.state = state;
    }
}
